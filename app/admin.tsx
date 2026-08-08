import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, FlatList,
  TextInput, Modal, KeyboardAvoidingView, ActivityIndicator, Alert, RefreshControl, TouchableOpacity, Platform
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ref, onValue } from 'firebase/database'; // إزالة get حيث لم نعد بحاجة إليه
import * as Clipboard from 'expo-clipboard'; 
import { getFunctions, httpsCallable } from 'firebase/functions';

import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { useAlert } from '../template';
import { Colors } from '../constants/theme';
import { isSuperAdmin, getVIPTier } from '../constants/config';
import { db } from '../services/firebaseConfig';

// --- Theme Constants for Purple/White Style ---
const PURPLE_MAIN = '#6200EE';
const PURPLE_LIGHT = '#F4EFFF';
const BG_WHITE = '#FFFFFF';
const BORDER_COLOR = '#E0D4F5';
const TEXT_DARK = '#1A0B2E';
const TEXT_MUTED = '#6B5E81';

export default function AdminScreen() {
  // @ts-ignore
  const { user, getAllUsers, adminUpdateUserBalance, adminSetVIP, adminDeleteUser } = useAuth();
  const { getAllTransactions } = useWallet();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'users' | 'historique'>('overview');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [pendingTxs, setPendingTxs] = useState<any[]>([]); 
  const [historyTxs, setHistoryTxs] = useState<any[]>([]); 
  const [filteredHistory, setFilteredHistory] = useState<any[]>([]); 
  const [historyFilter, setHistoryFilter] = useState<string>('ALL'); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState(''); 
  const [showVipOnly, setShowVipOnly] = useState(false);
  
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [newBalance, setNewBalance] = useState('');
  const [newVip, setNewVip] = useState(0);

  const [processingId, setProcessingId] = useState<string | null>(null);

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingTx, setRejectingTx] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [stats, setStats] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    platformProfit: 0,
    latchaShare: 0,
    hakimShare: 0,
    activeUsers: 0,
    vipHolders: 0
  });

  useEffect(() => {
    if (!user?.uid || !isSuperAdmin(user?.uid)) return;

    const txsRef = ref(db, 'transactions');
    
    const unsubscribeTxs = onValue(txsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const txsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));

        const pendingList = txsArray.filter(t => {
          const status = (t?.status || t?.state || 'pending').toLowerCase();
          return status === 'pending' || status === 'waiting';
        });
        setPendingTxs(pendingList);

        const sortedHistory = txsArray.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setHistoryTxs(sortedHistory);
      } else {
        setPendingTxs([]);
        setHistoryTxs([]);
      }
    }, (error) => {
      console.error("Live Transactions Stream Error:", error);
    });

    return () => unsubscribeTxs();
  }, [user?.uid]);

  useEffect(() => {
    let result = historyTxs;
    if (historyFilter !== 'ALL') {
      result = result.filter(t => (t.type || '').toUpperCase() === historyFilter.toUpperCase());
    }
    if (historySearchQuery.trim() !== '') {
      result = result.filter(t => 
        (t.username || '').toLowerCase().includes(historySearchQuery.toLowerCase()) ||
        (t.userId || '').toLowerCase().includes(historySearchQuery.toLowerCase())
      );
    }
    setFilteredHistory(result);
  }, [historyTxs, historyFilter, historySearchQuery]);

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      setIsRefreshing(true);
      
      // 1. جلب المستخدمين
      const rawUsers = await getAllUsers();
      let usersArray: any[] = [];
      if (rawUsers) {
        if (Array.isArray(rawUsers)) {
          usersArray = rawUsers;
        } else if (typeof rawUsers === 'object') {
          usersArray = Object.keys(rawUsers).map(key => ({
            uid: key,
            ...(rawUsers[key] as any)
          }));
        }
      }
      setAllUsers(usersArray);

      // 2. جلب كل العمليات من Firebase عبر Wallet Hook
      const rawTxs = await getAllTransactions();
      let txsArray: any[] = [];
      if (rawTxs) {
        if (Array.isArray(rawTxs)) {
          txsArray = rawTxs;
        } else if (typeof rawTxs === 'object') {
          txsArray = Object.keys(rawTxs).map(key => ({
            id: key,
            ...(rawTxs[key] as any)
          }));
        }
      }

      // --- التعديل هنا: حساب الأرقام محلياً بدلاً من جلبها من العقدة المخصصة ---
      
      // أ. حساب إجمالي الإيداعات الناجحة (أرباح المنصة)
      const pureDepositsVolume = txsArray
        .filter(t => {
          const type = (t?.type || t?.txType || '').trim().toLowerCase();
          const status = (t?.status || t?.state || '').trim().toLowerCase();
          return type === 'deposit' && (status === 'completed' || status === 'approved' || status === 'success');
        })
        .reduce((sum, t) => sum + (parseFloat(t.amount || t.value || 0) || 0), 0);

      // ب. حساب النسب المئوية للشركاء
      const pureManagerEarned = pureDepositsVolume * 0.80; // Latcha 80%
      const pureHakimEarned = pureDepositsVolume * 0.20;   // Hakim 20%

      // ج. حساب السحوبات الناجحة
      const withdrawals = txsArray
        .filter(t => {
          const type = (t?.type || t?.txType || '').trim().toLowerCase();
          const status = (t?.status || t?.state || '').trim().toLowerCase();
          return (type === 'withdrawal' || type === 'withdraw') && (status === 'completed' || status === 'approved' || status === 'success');
        })
        .reduce((sum, t) => sum + (parseFloat(t.amount || t.value || 0) || 0), 0);

      // 3. تحديث الإحصائيات
      setStats({
        totalDeposits: pureDepositsVolume, 
        totalWithdrawals: withdrawals,
        platformProfit: pureDepositsVolume, 
        latchaShare: pureManagerEarned,     
        hakimShare: pureHakimEarned,        
        activeUsers: usersArray.length,
        vipHolders: usersArray.filter(u => (parseInt(u.vip_level?.toString()) || 0) > 0).length
      });

    } catch (e) {
      console.error("Database parsing error in admin overview:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [getAllUsers, getAllTransactions, user?.uid]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleHistoryFilter = (filterType: string) => { setHistoryFilter(filterType); };

  const handleDeleteUserExecution = (targetUser: any) => {
    if (!targetUser || !targetUser.uid) {
      Alert.alert("Execution Denied", "Target User validation tokens expired.");
      return;
    }
    
    Alert.alert(
      "CRITICAL WARNING",
      `Are you sure you want to completely WIPE OUT ${targetUser.username}'s account identity? This data removal command is absolute!`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "WIPE OUT",
          style: "destructive",
          onPress: async () => {
            try {
              // @ts-ignore
              await adminDeleteUser(targetUser.uid, targetUser.referralCode || '');
              setEditingUser(null); 
              await loadData(); 
              showAlert('WIPED', 'Account document node has been completely cleared.');
            } catch (err: any) {
              Alert.alert("Wiping Interrupted", err.message);
            }
          }
        }
      ]
    );
  };

  const filteredUsers = allUsers.filter(u => {
    if (!searchQuery || searchQuery.trim() === '') {
      if (showVipOnly) return (parseInt(u.vip_level?.toString()) || 0) > 0;
      return true;
    }

    const safeUsername = String(u.username || '').toLowerCase();
    const safeEmail = String(u.email || '').toLowerCase();
    const safeRefCode = String(u.referralCode || '').toLowerCase(); 
    const safeQuery = searchQuery.toLowerCase().trim();

    const matchesSearch = safeUsername.includes(safeQuery) || safeEmail.includes(safeQuery) || safeRefCode.includes(safeQuery);
    
    if (showVipOnly) {
      return matchesSearch && (parseInt(u.vip_level?.toString()) || 0) > 0;
    }

    return matchesSearch;
  }).sort((a, b) => {
    const getSafeTime = (dateValue: any) => {
      if (!dateValue) return 0;
      if (typeof dateValue === 'number') return dateValue;
      const parsedTime = new Date(dateValue).getTime();
      return isNaN(parsedTime) ? 0 : parsedTime;
    };
    return getSafeTime(b.createdAt) - getSafeTime(a.createdAt);
  });

  const openRejectPrompt = (tx: any) => {
    if (processingId !== null) return;
    setRejectingTx(tx);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!rejectingTx) return;
    if (!rejectReason.trim()) {
      showAlert('Error', 'Please enter a valid rejection reason.');
      return;
    }

    try {
      setProcessingId(rejectingTx.id);
      setRejectModalVisible(false);

      const functions = getFunctions();
      const rejectTransaction = httpsCallable(functions, 'adminRejectTransaction');
      
      await rejectTransaction({ 
          txId: rejectingTx.id, 
          reason: rejectReason.trim() 
      });

      await loadData();
      showAlert('REJECTED', 'Order rejected successfully and user notified.');
    } catch (e: any) { 
      Alert.alert("Reject Fail", e.message || "An error occurred"); 
    } finally {
      setProcessingId(null);
      setRejectingTx(null);
      setRejectReason('');
    }
  };

  const handleApprove = async (tx: any) => {
    if (processingId !== null) return;

    try {
      setProcessingId(tx.id);
      const functions = getFunctions();
      const approveTransaction = httpsCallable(functions, 'adminApproveTransaction');
      
      await approveTransaction({ txId: tx.id });
      
      await loadData();
      showAlert('APPROVED', 'Order approved successfully.');
    } catch (e: any) {
      Alert.alert("Approve Fail", e.message || "An error occurred");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'approved' || s === 'success') return Colors.success || '#2ecc71';
    if (s === 'rejected' || s === 'failed') return Colors.danger || '#e74c3c';
    return '#FFB300'; 
  };

const sponsorCode = editingUser?.referredBy ? String(editingUser.referredBy).trim().toUpperCase() : "";
  let sponsorUser: any = null;
  if (sponsorCode !== "" && !sponsorCode.includes("NONE")) {
    sponsorUser = allUsers.find(u => {
      const uRefCode = u.referralCode ? String(u.referralCode).trim().toUpperCase() : "";
      const uUsername = u.username ? String(u.username).trim().toUpperCase() : "";
      const uUid = u.uid ? String(u.uid).trim().toUpperCase() : "";
      
      return (uRefCode !== "" && sponsorCode === uRefCode) || 
             sponsorCode === uUsername || 
             sponsorCode === uUid;
    });
  }

const sponsorEarnedFromThisUser = sponsorUser && editingUser ? historyTxs
    .filter(t => 
       t.userId === sponsorUser.uid && 
       t.type === 'Referral Bonus' && 
       t.note && 
       t.note.toLowerCase().includes((editingUser.username || '').toLowerCase())
    )
    .reduce((sum, t) => sum + (parseFloat(t.amount || 0) || 0), 0) : 0;

const referredUsersList = editingUser ? allUsers.filter(u => {
    if (!u.referredBy) return false;
    
    const checkVal = String(u.referredBy).trim().toLowerCase();
    const targetRefCode = editingUser.referralCode ? String(editingUser.referralCode).trim().toLowerCase() : "";
    const targetUsername = editingUser.username ? String(editingUser.username).trim().toLowerCase() : "";
    const targetUid = editingUser.uid ? String(editingUser.uid).trim().toLowerCase() : "";
    
    // مقارنة شاملة بحروف صغيرة لتجنب أي مشاكل في الـ Case
    return (targetRefCode !== "" && checkVal === targetRefCode) || 
           (targetUsername !== "" && checkVal === targetUsername) || 
           (targetUid !== "" && checkVal === targetUid);
  }) : [];

  const totalNetworkEarned = editingUser ? historyTxs
    .filter(t => t.userId === editingUser.uid && t.type === 'Referral Bonus')
    .reduce((sum, t) => sum + (parseFloat(t.amount || 0) || 0), 0) : 0;

  if (!user || !isSuperAdmin(user?.uid)) return null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <View>
            <Text style={styles.hSub}>MASTER COMMAND</Text>
            <Text style={styles.hTitle}>Lion App <Text style={{color: PURPLE_MAIN}}>Master</Text></Text>
          </View>
          <Pressable onPress={loadData} style={styles.refreshBtn} disabled={processingId !== null}>
            <Text style={{ fontSize: 24 }}>🔄</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          {['overview', 'requests', 'users', 'historique'].map((t) => (
            <Pressable 
              key={t} 
              disabled={processingId !== null}
              onPress={() => { setActiveTab(t as any); if (t !== 'users') setShowVipOnly(false); }} 
              style={[styles.tab, activeTab === t && styles.tabActive, { position: 'relative' }]}
            >
              <Text style={[styles.tabLabel, activeTab === t && { color: '#fff' }]}>{t.toUpperCase()}</Text>
              {t === 'requests' && pendingTxs.length > 0 && (
                <View style={styles.adminNotifBadge}>
                  <Text style={styles.adminNotifText}>{pendingTxs.length}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ flex: 1, width: '100%' }}>
        {isLoading && !isRefreshing ? (
          <View style={styles.center}><ActivityIndicator size="large" color={PURPLE_MAIN} /></View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', width: '100%' }}>
            <View style={{ flex: 1, width: '100%', maxWidth: 850 }}>
              
              {activeTab === 'overview' && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadData} tintColor={PURPLE_MAIN} />}>
                  <View style={styles.mainProfitCard}>
                    <View style={styles.glassEffect} />
                    <View style={styles.cardContent}>
                      <Text style={styles.cardLabel}>TOTAL PLATFORM PROFIT (PURE DEPOSITS VOLUME)</Text>
                      <Text style={styles.cardValue}>${stats.platformProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                      <View style={styles.splitGrid}>
                        <View style={styles.splitBox}>
                          <Text style={styles.splitTitle}>LATCHA SHARE (80%)</Text>
                          <Text style={[styles.splitValue, {color: PURPLE_MAIN}]}>${stats.latchaShare.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                        </View>
                        <View style={styles.splitDivider} />
                        <View style={styles.splitBox}>
                          <Text style={styles.splitTitle}>HAKIM SHARE (20%)</Text>
                          <Text style={styles.splitValue}>${stats.hakimShare.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.sectionTitle}>COMMAND TILES</Text>
                  <View style={styles.commandGrid}>
                      {[
                        { label: 'Pending Txs', val: pendingTxs.length, icon: '⏳', action: () => { setActiveTab('requests'); setShowVipOnly(false); } },
                        { label: 'Active Users', val: stats.activeUsers, icon: '👥', action: () => { setActiveTab('users'); setShowVipOnly(false); } },
                        { label: 'VIP Holders', val: stats.vipHolders, icon: '💎', action: () => { setActiveTab('users'); setShowVipOnly(true); } },
                        { label: 'Total Logs', val: historyTxs.length, icon: '📂', action: () => { setActiveTab('historique'); setShowVipOnly(false); } }
                      ].map((item, i) => (
                        <Pressable key={i} style={styles.commandTile} onPress={item.action} disabled={processingId !== null}>
                          <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                          <Text style={styles.tileVal}>{item.val}</Text>
                          <Text style={styles.tileLabel}>{item.label}</Text>
                        </Pressable>
                      ))}
                  </View>

                  <Text style={styles.sectionTitle}>FINANCIAL INTELLIGENCE</Text>
                  <View style={styles.financeBox}>
                    {[
                      { label: 'Total Volume (Pure Deposits)', val: stats.totalDeposits, color: Colors.success, icon: '📈' },
                      { label: 'Total Withdrawals', val: stats.totalWithdrawals, color: Colors.danger, icon: '📉' },
                      { label: 'System Capital', val: allUsers.reduce((sum, u) => sum + (parseFloat(u.balance?.toString()) || 0), 0), color: PURPLE_MAIN, icon: '🏦' }
                    ].map((item, i) => (
                      <View key={i} style={[styles.fRow, i === 2 && { borderBottomWidth: 0 }]}>
                        <Text style={{ fontSize: 14, marginRight: 4 }}>{item.icon}</Text>
                        <Text style={styles.fLabel}>{item.label}</Text>
                        <Text style={[styles.fVal, { color: item.color }]}>${item.val.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}

              {activeTab === 'requests' && (
                <FlatList
                  data={pendingTxs}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listPadding}
                  renderItem={({ item }) => {
                    const isCurrentProcessing = processingId === item.id;
                    const normalizedType = (item.type || '').toLowerCase();
                    const isWithdrawal = normalizedType === 'withdrawal' || normalizedType === 'withdraw';
                    const isDeposit = normalizedType === 'deposit';
                    const targetAddress = item.walletAddress || item.address || '';

                    return (
                      <View style={styles.luxuryReqCard}>
                        <View style={styles.reqTop}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.reqName}>{item.username || 'Unknown User'}</Text>
                            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 4 }}>
                              <View style={[styles.reqBadge, { marginTop: 0, backgroundColor: isDeposit ? '#E8F5E9' : '#FFEBEE' }]}>
                                <Text style={{ color: isDeposit ? '#2E7D32' : '#C62828', fontSize: 10, fontWeight: 'bold' }}>
                                  {(item.type || 'Deposit').toUpperCase()}
                                </Text>
                              </View>
                              <Text style={{ color: TEXT_MUTED, fontSize: 11 }}>ID: {item.userId ? item.userId.substring(0,6) : 'N/A'}</Text>
                            </View>
                          </View>
                          <Text style={styles.reqAmount}>${(item.amount || item.value || 0).toLocaleString()}</Text>
                        </View>

                        {isDeposit && (
                          <View style={styles.txidIntelBlock}>
                            <Text style={styles.txidBlockLabel}>TRANSACTION HASH :</Text>
                            <View style={styles.txidRow}>
                              <Text style={styles.txidTextString} numberOfLines={1} selectable>{item.txid || '⚠️ Missing Hash Code'}</Text>
                              {item.txid && (
                                <Pressable style={styles.txidMiniCopyBtn} onPress={async () => { await Clipboard.setStringAsync(item.txid); showAlert('Copied!', 'TXID Hash copied to admin clipboard.'); }}>
                                  <Text style={{ fontSize: 11 }}>📋</Text>
                                  <Text style={{ color: PURPLE_MAIN, fontSize: 10, fontWeight: 'bold' }}>Copy</Text>
                                </Pressable>
                              )}
                            </View>
                          </View>
                        )}

                        {isWithdrawal && (
                          <View style={styles.txidIntelBlock}>
                            <Text style={styles.txidBlockLabel}>USDT BEP20 DESTINATION ADDRESS :</Text>
                            <View style={styles.txidRow}>
                              <Text style={styles.txidTextString} numberOfLines={1} selectable>
                                {targetAddress || '⚠️ Missing Address'}
                              </Text>
                              {targetAddress ? (
                                <Pressable 
                                  style={styles.txidMiniCopyBtn} 
                                  onPress={async () => { 
                                    await Clipboard.setStringAsync(targetAddress); 
                                    showAlert('Copied!', 'Wallet Address copied to admin clipboard.'); 
                                  }}
                                >
                                  <Text style={{ fontSize: 11 }}>📋</Text>
                                  <Text style={{ color: PURPLE_MAIN, fontSize: 10, fontWeight: 'bold' }}>Copy</Text>
                                </Pressable>
                              ) : null}
                            </View>
                          </View>
                        )}
                        
                        <View style={styles.reqActions}>
                          <Pressable style={[styles.miniBtnRej, processingId !== null && { opacity: 0.4 }]} onPress={() => openRejectPrompt(item)} disabled={processingId !== null}>
                            <Text style={{ fontSize: 12, marginRight: 2 }}>❌</Text>
                            <Text style={styles.miniBtnTextRej}>REJECT</Text>
                          </Pressable>
                          
                          <Pressable style={[styles.miniBtnApp, processingId !== null && { opacity: 0.6 }]} onPress={() => handleApprove(item)} disabled={processingId !== null}>
                            {isCurrentProcessing ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <><Text style={{ fontSize: 12, marginRight: 2 }}>✅</Text><Text style={styles.miniBtnTextApp}>APPROVE</Text></>
                            )}
                          </Pressable>
                        </View>
                      </View>
                    );
                  }}
                  ListEmptyComponent={<Text style={styles.emptyText}>No pending operations.</Text>}
                />
              )}

              {activeTab === 'users' && (
                <View style={{ flex: 1, width: '100%' }}>
                  <View style={styles.searchContainer}>
                    <Text style={{ fontSize: 14, marginRight: 6 }}>🔍</Text>
                    <TextInput style={styles.searchInput} placeholder="Search user identity..." placeholderTextColor={TEXT_MUTED} value={searchQuery} onChangeText={setSearchQuery} editable={processingId === null} />
                  </View>
                  {showVipOnly && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 15, alignItems: 'center' }}>
                      <Text style={{ color: '#00B8D4', fontSize: 12, fontWeight: 'bold' }}>💎 Showing VIP Holders Only ({filteredUsers.length})</Text>
                      <Pressable onPress={() => setShowVipOnly(false)} disabled={processingId !== null}><Text style={{ color: PURPLE_MAIN, fontSize: 12, fontWeight: 'bold', textDecorationLine: 'underline' }}>Clear Filter</Text></Pressable>
                    </View>
                  )}
                  <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item.uid || Math.random().toString()}
                    contentContainerStyle={styles.listPadding}
                    ListEmptyComponent={
                      <View style={{ alignItems: 'center', marginTop: 80 }}>
                        <Text style={{ fontSize: 50 }}>📭</Text>
                        <Text style={{ color: TEXT_DARK, fontSize: 18, marginTop: 15, fontWeight: 'bold' }}>
                          {allUsers.length === 0 ? "قاعدة البيانات مارجعت حتى مستخدم!" : "مكاش مستخدم بهاد الاسم!"}
                        </Text>
                        <Text style={{ color: PURPLE_MAIN, fontSize: 14, marginTop: 8 }}>
                          (إجمالي المستخدمين في الذاكرة: {allUsers.length})
                        </Text>
                      </View>
                    }
                    renderItem={({ item }) => {
                      const tier = getVIPTier(item.vip_level || 0);
                      const totalReferredCount = allUsers.filter(u => {
                        if (!u.referredBy) return false;
                        const checkVal = String(u.referredBy).trim().toUpperCase();
                        const targetRefCode = item.referralCode ? String(item.referralCode).trim().toUpperCase() : "";
                        const targetUsername = item.username ? String(item.username).trim().toUpperCase() : "";
                        const targetUid = item.uid ? String(item.uid).trim().toUpperCase() : "";
                        if (checkVal.startsWith("NOIR-")) return targetRefCode !== "" && checkVal === targetRefCode;
                        return checkVal === targetUsername || checkVal === targetUid;
                      }).length;
                      const networkEarnings = historyTxs.filter(t => t.userId === item.uid && t.type === 'Referral Bonus').reduce((sum, t) => sum + (parseFloat(t.amount || 0) || 0), 0);
                      return (
                        <View style={styles.userEliteCard}>
                          <View style={[styles.uAvatar, { borderColor: tier.color }]}>
                            {item.profileImage ? (<Image source={{ uri: item.profileImage }} style={{ width: '100%', height: '100%', borderRadius: 24 }} />) : (<Text style={{ color: tier.color, fontWeight: 'bold' }}>{item.username ? item.username[0].toUpperCase() : 'U'}</Text>)}
                          </View>
                          <View style={{ flex: 1, marginLeft: 15 }}>
                            <Text style={[styles.uName, item.isFullyVerified && { color: Colors.success }]}>{item.username} {item.isFullyVerified && '✔'}</Text>
                            <Text style={styles.uEmail}>{item.email}</Text>
                            <View style={styles.uBadgeRow}>
                               <Text style={[styles.uVipTag, { color: tier.color }]}>VIP {item.vip_level}</Text>
                               <Text style={styles.uBalanceTag}>${(parseFloat(item.balance?.toString()) || 0).toFixed(2)}</Text>
                            </View>
                            <View style={styles.uNetworkIntelRow}>
                              <View style={styles.uNetworkStatItem}><Text style={{ fontSize: 11 }}>👥</Text><Text style={styles.uNetworkStatText}>Refs: <Text style={{color: TEXT_DARK, fontWeight: 'bold'}}>{totalReferredCount}</Text></Text></View>
                              <View style={styles.uNetworkStatDivider} />
                              <View style={styles.uNetworkStatItem}><Text style={{ fontSize: 11 }}>🎁</Text><Text style={styles.uNetworkStatText}>Earned: <Text style={{color: PURPLE_MAIN, fontWeight: 'bold'}}>${networkEarnings.toFixed(2)}</Text></Text></View>
                            </View>
                          </View>
                          <Pressable style={styles.uEditBtn} disabled={processingId !== null} onPress={() => { setEditingUser(item); setNewBalance(item.balance?.toString() || '0'); setNewVip(item.vip_level || 0); }}><Text style={{ fontSize: 14 }}>⚙️</Text></Pressable>
                        </View>
                      );
                    }}
                  />
                </View>
              )}

              {activeTab === 'historique' && (
                <View style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyFilterScroll} contentContainerStyle={styles.historyFilterBar}>
                    {['ALL', 'Deposit', 'Withdrawal', 'Reward', 'Referral Bonus', 'VIP Upgrade'].map((f) => (
                      <Pressable key={f} onPress={() => handleHistoryFilter(f)} style={[styles.historyFilterTab, historyFilter === f && { backgroundColor: PURPLE_MAIN, borderColor: PURPLE_MAIN }]}>
                        <Text style={[styles.historyFilterLabel, historyFilter === f && { color: '#fff' }]}>{f.toUpperCase()}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <View style={[styles.searchContainer, { marginTop: 0, marginBottom: 15 }]}>
                    <Text style={{ fontSize: 14, marginRight: 6 }}>🔍</Text>
                    <TextInput style={styles.searchInput} placeholder="Search history by username or user ID..." placeholderTextColor={TEXT_MUTED} value={historySearchQuery} onChangeText={setHistorySearchQuery} editable={processingId === null} />
                  </View>
                  <View style={styles.historySummaryCard}>
                    <Text style={styles.hSumTitle}>FILTERED LOGS: <Text style={{color: PURPLE_MAIN}}>{filteredHistory.length}</Text></Text>
                    <Text style={styles.hSumValue}>Total Value: ${filteredHistory.reduce((sum, t) => sum + (parseFloat(t.amount || 0) || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                  </View>
                  <FlatList
                    data={filteredHistory}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listPadding}
                    renderItem={({ item }) => (
                      <View style={styles.historyLogCard}>
                        <View style={styles.logHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.logUser}>{item.username || 'System Log'}</Text>
                            <Text style={styles.logNote}>{item.note || 'No description provided.'}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.logAmount}>${(item.amount || 0).toLocaleString()}</Text>
                            <Text style={[styles.logStatus, { color: getStatusColor(item.status) }]}>{(item.status || 'Completed').toUpperCase()}</Text>
                          </View>
                        </View>
                        <View style={styles.logFooter}>
                          <Text style={styles.logTypeTag}>{item.type || 'Transaction'}</Text>
                          <Text style={styles.logDate}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}</Text>
                        </View>
                      </View>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyText}>No records match this query.</Text>}
                  />
                </View>
              )}

            </View>
          </View>
        )}
      </View>

      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.rejectModalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.rejectModalContent}>
            <Text style={styles.rejectTitle}>❌ REJECT TRANSACTION</Text>
            <Text style={styles.rejectSub}>Please provide a reason for rejecting this {rejectingTx?.type} of ${rejectingTx?.amount}. This will be sent to the user.</Text>
            
            <TextInput
              style={styles.rejectInput}
              placeholder="Type rejection reason here (e.g., Invalid TXID, Wrong Network...)"
              placeholderTextColor={TEXT_MUTED}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            
            <View style={styles.rejectActions}>
              <Pressable style={styles.rejectCancelBtn} onPress={() => { setRejectModalVisible(false); setRejectReason(''); }}>
                <Text style={{ color: TEXT_DARK, fontWeight: 'bold' }}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.rejectConfirmBtn} onPress={confirmReject}>
                {processingId !== null ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Confirm Reject</Text>}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={!!editingUser} transparent animationType="slide">
        <View style={styles.modal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.mContent}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.mContentScrollView}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                <View style={{ width: 36 }} /> 
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <View style={styles.mHandle} />
                  <Text style={styles.mTitle}>Account Intelligence</Text>
                  <Text style={[styles.mSub, editingUser?.isFullyVerified && { color: Colors.success }]}>{editingUser?.username} {editingUser?.isFullyVerified && '✔'}</Text>
                </View>
                <TouchableOpacity style={styles.closeModalBtnTop} onPress={() => setEditingUser(null)}><Text style={{ fontSize: 14 }}>❌</Text></TouchableOpacity>
              </View>

              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: PURPLE_MAIN, justifyContent: 'center', alignItems: 'center', backgroundColor: BG_WHITE, overflow: 'hidden' }}>
                  {editingUser?.profileImage ? (<Image source={{ uri: editingUser.profileImage }} style={{ width: '100%', height: '100%' }} />) : (<Text style={{ fontSize: 24 }}>👤</Text>)}
                </View>
              </View>

              <View style={styles.networkBox}>
                <View style={styles.networkBoxHeader}><Text style={styles.networkBoxTitle}>🤝 REFERRED BY (SPONSOR INFO)</Text></View>
                {sponsorUser ? (
                  <View style={[styles.refUserRow, { borderColor: PURPLE_MAIN }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.refUserName, sponsorUser.isFullyVerified && { color: Colors.success }]}>{sponsorUser.username} {sponsorUser.isFullyVerified && '✔'}</Text>
                      <Text style={styles.refUserEmail}>{sponsorUser.email}</Text>
                      <Text style={[styles.refUserVip, { marginTop: 4 }]}>VIP {sponsorUser.vip_level || 0} • Bal: ${(parseFloat(sponsorUser.balance?.toString()) || 0).toFixed(2)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                      <Text style={{ color: TEXT_MUTED, fontSize: 9, fontWeight: 'bold', marginBottom: 4 }}>REWARD TAKEN</Text>
                      <Text style={{ color: PURPLE_MAIN, fontSize: 16, fontWeight: 'bold' }}>+${sponsorEarnedFromThisUser.toFixed(2)}</Text>
                    </View>
                  </View>
                ) : (<Text style={styles.emptyNetworkText}>Direct Registration (No Sponsor)</Text>)}
              </View>

              {referredUsersList.length > 0 && (
                <View style={styles.networkBox}>
                  <View style={styles.networkBoxHeader}><Text style={styles.networkBoxTitle}>👥 DOWNLINE NETWORK ({referredUsersList.length})</Text><Text style={styles.networkBoxTotal}>Rewards Earned: ${totalNetworkEarned.toFixed(2)}</Text></View>
                  {referredUsersList.map((refUser, idx) => (
                    <View key={idx} style={styles.refUserRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.refUserName, refUser.isFullyVerified && { color: Colors.success }]}>{refUser.username} {refUser.isFullyVerified && '✔'}</Text>
                        <Text style={styles.refUserEmail}>{refUser.email}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.refUserVip}>VIP {refUser.vip_level || 0}</Text>
                        <Text style={styles.refUserBalance}>${(parseFloat(refUser.balance?.toString()) || 0).toFixed(2)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.intelBox}>
                <Text style={styles.intelTitle}>🔒 USER CREDENTIALS & METRICS</Text>
                <View style={styles.intelRow}><Text style={styles.intelLabel}>User UID:</Text><Text style={styles.intelVal}>{editingUser?.uid}</Text></View>
                <View style={styles.intelRow}><Text style={styles.intelLabel}>Email ID:</Text><Text style={styles.intelVal}>{editingUser?.email}</Text></View>
                <View style={styles.intelRow}><Text style={styles.intelLabel}>Phone Contact:</Text><Text style={styles.intelVal}>{editingUser?.phone || 'Not Linked'}</Text></View>
                <View style={styles.intelRow}><Text style={styles.intelLabel}>Joined Date:</Text><Text style={styles.intelVal}>{editingUser?.createdAt ? new Date(editingUser.createdAt).toLocaleDateString() : 'N/A'}</Text></View>
                <View style={styles.intelRow}><Text style={styles.intelLabel}>Referred By:</Text><Text style={[styles.intelVal, {color: PURPLE_MAIN}]}>{editingUser?.referredBy || 'Direct Registration'}</Text></View>
                <View style={styles.intelRow}><Text style={styles.intelLabel}>Verification:</Text><Text style={[styles.intelVal, {color: editingUser?.isFullyVerified ? Colors.success : '#2bff00'}]}>{editingUser?.isFullyVerified ? 'Verified KYC 🛡️' : 'verified Account'}</Text></View>
                <View style={[styles.intelRow, {borderBottomWidth: 0}]}><Text style={styles.intelLabel}>Referral Code:</Text><Text style={[styles.intelVal, {color: PURPLE_MAIN, fontWeight: 'bold'}]}>{editingUser?.referralCode || 'NONE'}</Text></View>
              </View>

              <Text style={[styles.mLabel, { marginTop: 10 }]}>MODIFY USER LIQUID BALANCE ($)</Text>
              <TextInput style={styles.mInput} value={newBalance} onChangeText={newVal => setNewBalance(newVal)} keyboardType="decimal-pad" />
              
              <Text style={styles.mLabel}>OVERRIDE VIP MEMBERSHIP TIER</Text>
              <View style={styles.vipPicker}>
                   {[0,1,2,3,4,5,6].map(lvl => (
                     <Pressable key={lvl} onPress={()=>setNewVip(lvl)} style={[styles.vipOpt, newVip === lvl && {backgroundColor: PURPLE_MAIN, borderColor: PURPLE_MAIN}]}>
                       <Text style={[styles.vipOptText, newVip === lvl && {color: '#fff'}]}>V{lvl}</Text>
                     </Pressable>
                   ))}
              </View>

              <TouchableOpacity 
                style={{flexDirection: 'row', backgroundColor: 'rgba(255, 77, 77, 0.08)', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255, 77, 77, 0.2)', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20, marginTop: 5}} 
                onPress={() => handleDeleteUserExecution(editingUser)}
              >
                <Text style={{ fontSize: 16 }}>🗑️</Text>
                <Text style={{ color: '#E53935', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 }}>DELETE THIS ACCOUNT NODE</Text>
              </TouchableOpacity>

              <View style={styles.mActions}>
                <Pressable style={styles.mBtnC} onPress={() => setEditingUser(null)}><Text style={{ color: TEXT_DARK }}>Discard</Text></Pressable>
                <Pressable style={styles.mBtnS} onPress={async () => {
                  await adminUpdateUserBalance(editingUser.uid, parseFloat(newBalance) || 0);
                  await adminSetVIP(editingUser.uid, newVip);
                  setEditingUser(null); loadData();
                  showAlert('Success', 'Profile updated.');
                }}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Update Profile</Text></Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PURPLE_LIGHT, alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { width: '100%', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25, width: '100%', maxWidth: 850 },
  hSub: { color: TEXT_MUTED, fontSize: 10, fontWeight: 'bold', letterSpacing: 2 },
  hTitle: { color: TEXT_DARK, fontSize: 24, fontWeight: 'bold' },
  refreshBtn: { padding: 5, justifyContent: 'center', alignItems: 'center' },
  tabBarContainer: { width: '100%', alignItems: 'center' },
  tabBar: { flexDirection: 'row', backgroundColor: BG_WHITE, borderRadius: 20, padding: 5, borderWidth: 1, borderColor: BORDER_COLOR, marginBottom: 15, width: '90%', maxWidth: 850 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  tabActive: { backgroundColor: PURPLE_MAIN },
  tabLabel: { color: TEXT_MUTED, fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  adminNotifBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#E53E3E', minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BG_WHITE, paddingHorizontal: 4 },
  adminNotifText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  mainProfitCard: { height: 200, borderRadius: 30, overflow: 'hidden', marginBottom: 25, borderWidth: 1, borderColor: BORDER_COLOR, width: '100%', backgroundColor: PURPLE_MAIN },
  glassEffect: { ...StyleSheet.absoluteFillObject, backgroundColor: '#ffffff', opacity: 0.1 },
  cardContent: { flex: 1, padding: 25, justifyContent: 'center', alignItems: 'center' },
  cardLabel: { color: '#E0D4F5', fontSize: 9, fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 },
  cardValue: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
  splitGrid: { flexDirection: 'row', marginTop: 25, width: '100%', alignItems: 'center' },
  splitBox: { flex: 1, alignItems: 'center' },
  splitTitle: { color: '#E0D4F5', fontSize: 8, fontWeight: 'bold', marginBottom: 4 },
  splitValue: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  splitDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
  commandGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 25, width: '100%', justifyContent: 'space-between' },
  commandTile: { width: '48%', backgroundColor: BG_WHITE, padding: 20, borderRadius: 25, borderWidth: 1, borderColor: BORDER_COLOR, gap: 8 },
  tileVal: { color: TEXT_DARK, fontSize: 20, fontWeight: 'bold' },
  tileLabel: { color: TEXT_MUTED, fontSize: 9, fontWeight: 'bold' },
  sectionTitle: { color: TEXT_MUTED, fontSize: 10, fontWeight: 'bold', marginTop: 10, marginBottom: 15, marginLeft: 10, letterSpacing: 1.5 },
  financeBox: { backgroundColor: BG_WHITE, borderRadius: 25, padding: 5, borderWidth: 1, borderColor: BORDER_COLOR, width: '100%' },
  fRow: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: PURPLE_LIGHT },
  fLabel: { flex: 1, color: TEXT_MUTED, fontSize: 13, marginLeft: 12 },
  fVal: { fontWeight: 'bold', fontSize: 15 },
  luxuryReqCard: { backgroundColor: BG_WHITE, marginBottom: 15, borderRadius: 25, padding: 20, borderWidth: 1, borderColor: BORDER_COLOR, width: '100%' },
  reqTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reqName: { color: TEXT_DARK, fontSize: 18, fontWeight: 'bold' },
  reqBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 5 },
  reqAmount: { color: PURPLE_MAIN, fontSize: 22, fontWeight: 'bold' },
  reqActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  miniBtnApp: { flex: 2, backgroundColor: PURPLE_MAIN, flexDirection: 'row', padding: 15, borderRadius: 15, justifyContent: 'center', alignItems: 'center', gap: 8 },
  miniBtnRej: { flex: 1, backgroundColor: '#F5F5F5', flexDirection: 'row', padding: 15, borderRadius: 15, justifyContent: 'center', alignItems: 'center', gap: 8 },
  miniBtnTextApp: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  miniBtnTextRej: { color: TEXT_MUTED, fontWeight: 'bold', fontSize: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG_WHITE, marginVertical: 20, paddingHorizontal: 15, borderRadius: 15, borderWidth: 1, borderColor: BORDER_COLOR, width: '100%', maxWidth: '100%' },
  searchInput: { flex: 1, padding: 15, color: TEXT_DARK },
  userEliteCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG_WHITE, marginBottom: 10, padding: 18, borderRadius: 25, borderWidth: 1, borderColor: BORDER_COLOR, width: '100%' },
  uAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, backgroundColor: PURPLE_LIGHT, justifyContent: 'center', alignItems: 'center' },
  uName: { color: TEXT_DARK, fontSize: 16, fontWeight: 'bold' },
  uEmail: { color: TEXT_MUTED, fontSize: 11, marginBottom: 5 },
  uBadgeRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  uVipTag: { fontSize: 10, fontWeight: 'bold' },
  uBalanceTag: { color: PURPLE_MAIN, fontSize: 11, fontWeight: 'bold' },
  uEditBtn: { padding: 12, backgroundColor: PURPLE_LIGHT, borderRadius: 15, borderWidth: 1, borderColor: BORDER_COLOR, justifyContent: 'center', alignItems: 'center' },
  modal: { flex: 1, backgroundColor: 'rgba(26, 11, 46, 0.7)', justifyContent: 'flex-end', alignItems: 'center', width: '100%' },
  mContent: { position: 'relative', backgroundColor: BG_WHITE, padding: 30, borderTopLeftRadius: 35, borderTopRightRadius: 35, borderWidth: 1, borderColor: BORDER_COLOR, maxHeight: '90%', width: '100%', maxWidth: 700 },
  closeModalBtnTop: { width: 36, height: 36, borderRadius: 18, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER_COLOR, marginTop: 10 },
  mContentScrollView: { paddingBottom: 30 },
  mHandle: { width: 40, height: 4, backgroundColor: BORDER_COLOR, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  mTitle: { color: TEXT_DARK, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  mSub: { color: PURPLE_MAIN, fontSize: 12, textAlign: 'center', marginBottom: 25, fontWeight: 'bold' },
  mLabel: { color: TEXT_MUTED, fontSize: 10, fontWeight: 'bold', marginBottom: 10, letterSpacing: 1 },
  mInput: { backgroundColor: PURPLE_LIGHT, color: PURPLE_MAIN, padding: 18, borderRadius: 15, fontSize: 22, fontWeight: 'bold', borderWidth: 1, borderColor: BORDER_COLOR, textAlign: 'center', marginBottom: 25 },
  vipPicker: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 35, width: '100%' },
  vipOpt: { width: 38, height: 38, borderRadius: 10, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER_COLOR },
  vipOptText: { color: TEXT_MUTED, fontWeight: 'bold', fontSize: 12 },
  mActions: { flexDirection: 'row', gap: 12, marginTop: 10, width: '100%' },
  mBtnS: { flex: 2, backgroundColor: PURPLE_MAIN, padding: 18, borderRadius: 15, alignItems: 'center' },
  mBtnC: { flex: 1, backgroundColor: '#F5F5F5', padding: 18, borderRadius: 15, alignItems: 'center' },
  listPadding: { paddingBottom: 150, width: '100%' },
  emptyText: { color: TEXT_MUTED, textAlign: 'center', marginTop: 50, fontWeight: 'bold' },
  historyFilterScroll: { height: 55, marginBottom: 15, width: '100%', maxWidth: '100%' },
  historyFilterBar: { paddingHorizontal: 10, alignItems: 'center', flexDirection: 'row' },
  historyFilterTab: { backgroundColor: BG_WHITE, paddingHorizontal: 14, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER_COLOR, marginRight: 8 },
  historyFilterLabel: { color: TEXT_MUTED, fontSize: 10, fontWeight: 'bold' },
  historySummaryCard: { backgroundColor: PURPLE_MAIN, borderRadius: 15, padding: 15, borderWidth: 1, borderColor: BORDER_COLOR, marginBottom: 15, width: '100%' },
  hSumTitle: { color: '#E0D4F5', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  hSumValue: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 5 },
  historyLogCard: { backgroundColor: BG_WHITE, marginBottom: 10, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: BORDER_COLOR, width: '100%' },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logUser: { color: TEXT_DARK, fontSize: 15, fontWeight: 'bold' },
  logNote: { color: TEXT_MUTED, fontSize: 11, marginTop: 4, lineHeight: 16 },
  logAmount: { color: TEXT_DARK, fontSize: 16, fontWeight: 'bold' },
  logStatus: { fontSize: 9, fontWeight: '900', marginTop: 4, letterSpacing: 0.5 },
  logFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: PURPLE_LIGHT, paddingTop: 10 },
  logTypeTag: { color: PURPLE_MAIN, backgroundColor: PURPLE_LIGHT, fontSize: 9, fontWeight: 'bold', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, overflow: 'hidden' },
  logDate: { color: TEXT_MUTED, fontSize: 10, fontWeight: 'bold' },
  intelBox: { backgroundColor: BG_WHITE, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: BORDER_COLOR, marginBottom: 20, width: '100%' },
  intelTitle: { color: PURPLE_MAIN, fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: PURPLE_LIGHT, paddingBottom: 8 },
  intelRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: PURPLE_LIGHT },
  intelLabel: { color: TEXT_MUTED, fontSize: 12, fontWeight: '600' },
  intelVal: { color: TEXT_DARK, fontSize: 12, fontWeight: '700', maxWidth: '65%', textAlign: 'right' },
  txidIntelBlock: { backgroundColor: PURPLE_LIGHT, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: BORDER_COLOR, marginTop: 15, gap: 5, width: '100%' },
  txidBlockLabel: { color: TEXT_MUTED, fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },
  txidRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  txidTextString: { flex: 1, color: PURPLE_MAIN, fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' },
  txidMiniCopyBtn: {flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(98, 0, 238, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(98, 0, 238, 0.2)' },
  uNetworkIntelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: PURPLE_LIGHT, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: BORDER_COLOR, alignSelf: 'flex-start', gap: 8 },
  uNetworkStatItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  uNetworkStatText: { color: TEXT_MUTED, fontSize: 11, fontWeight: '500' },
  uNetworkStatDivider: { width: 1, height: 10, backgroundColor: BORDER_COLOR },
  networkBox: { backgroundColor: BG_WHITE, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: BORDER_COLOR, marginBottom: 20, width: '100%' },
  networkBoxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: PURPLE_LIGHT, paddingBottom: 10 },
  networkBoxTitle: { color: PURPLE_MAIN, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  networkBoxTotal: { color: Colors.success, fontSize: 11, fontWeight: 'bold' },
  emptyNetworkText: { color: TEXT_MUTED, fontSize: 11, textAlign: 'center', paddingVertical: 10, fontStyle: 'italic' },
  refUserRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: PURPLE_LIGHT, padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: BORDER_COLOR },
  refUserName: { color: TEXT_DARK, fontSize: 13, fontWeight: 'bold' },
  refUserEmail: { color: TEXT_MUTED, fontSize: 10, marginTop: 2 },
  refUserVip: { color: '#00B8D4', fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
  refUserBalance: { color: PURPLE_MAIN, fontSize: 12, fontWeight: 'bold' },

  rejectModalOverlay: { flex: 1, backgroundColor: 'rgba(26, 11, 46, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  rejectModalContent: { backgroundColor: BG_WHITE, width: '100%', maxWidth: 400, borderRadius: 25, padding: 25, borderWidth: 1, borderColor: BORDER_COLOR },
  rejectTitle: { color: '#D32F2F', fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  rejectSub: { color: TEXT_MUTED, fontSize: 12, textAlign: 'center', marginBottom: 25, lineHeight: 18 },
  rejectInput: { backgroundColor: PURPLE_LIGHT, color: TEXT_DARK, padding: 15, borderRadius: 12, minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: BORDER_COLOR, marginBottom: 25 },
  rejectActions: { flexDirection: 'row', gap: 12 },
  rejectCancelBtn: { flex: 1, backgroundColor: '#F5F5F5', padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: BORDER_COLOR },
  rejectConfirmBtn: { flex: 1, backgroundColor: '#D32F2F', padding: 15, borderRadius: 12, alignItems: 'center' }
});