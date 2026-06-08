import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, FlatList,
  TextInput, Modal, KeyboardAvoidingView, ActivityIndicator, Animated, Alert, RefreshControl, TouchableOpacity, Platform
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ref, get, update, onValue } from 'firebase/database'; 
import * as Clipboard from 'expo-clipboard'; 

import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { useAlert } from '../template';
import { Colors } from '../constants/theme';
import { isSuperAdmin, getVIPTier } from '../constants/config';
import { recordFinancialTransaction } from '../services/financialService';
import { db } from '../services/firebaseConfig';

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

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    platformProfit: 0,
    latchaShare: 0,
    hakimShare: 0,
    activeUsers: 0,
    vipHolders: 0
  });

  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (!user?.uid || !isSuperAdmin(user.email)) return;

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
  }, [user?.uid, user?.email]);

  useEffect(() => {
    let result = historyTxs;

    if (historyFilter !== 'ALL') {
      result = result.filter(t => (t.type || '').toUpperCase() === historyFilter.toUpperCase());
    }

    if (historySearchQuery.trim() !== '') {
      result = result.filter(t => 
        t.username?.toLowerCase().includes(historySearchQuery.toLowerCase())
      );
    }

    setFilteredHistory(result);
  }, [historyTxs, historyFilter, historySearchQuery]);

  const loadData = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setIsRefreshing(true);
      
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

      const financeSnap = await get(ref(db, 'platform_finances/totals'));
      
      let pureDepositsVolume = 0;
      let pureHakimEarned = 0;
      let pureManagerEarned = 0;

      if (financeSnap.exists()) {
        const financeData = financeSnap.val();
        pureDepositsVolume = parseFloat(financeData.total_deposits_volume?.toString() || '0');
        pureHakimEarned = parseFloat(financeData.hakim_total_earned?.toString() || '0');
        pureManagerEarned = parseFloat(financeData.manager_total_earned?.toString() || '0');
      }

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

      const withdrawals = txsArray
        .filter(t => {
          const type = (t?.type || t?.txType || '').trim().toLowerCase();
          const status = (t?.status || t?.state || '').trim().toLowerCase();
          return type === 'withdrawal' && (status === 'completed' || status === 'approved' || status === 'success');
        })
        .reduce((sum, t) => sum + (parseFloat(t.amount || t.value || 0) || 0), 0);

      setStats({
        totalDeposits: pureDepositsVolume, 
        totalWithdrawals: withdrawals,
        platformProfit: pureDepositsVolume, 
        latchaShare: pureManagerEarned,     
        hakimShare: pureHakimEarned,        
        activeUsers: usersArray.length,
        vipHolders: usersArray.filter(u => (parseInt(u.vip_level?.toString()) || 0) > 0).length
      });

      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    } catch (e) {
      console.error("Database parsing error in admin overview:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [getAllUsers, getAllTransactions, user?.uid]);

  useEffect(() => { 
    loadData(); 
  }, [loadData]);

  const handleHistoryFilter = (filterType: string) => {
    setHistoryFilter(filterType);
  };

  const handleDeleteUserExecution = (targetUser: any) => {
    if (!targetUser || !targetUser.uid) {
      Alert.alert("Execution Denied", "Target User validation tokens expired.");
      return;
    }
    const confirmed = window.confirm(`[CRITICAL WARNING]\nAre you sure you want to completely WIPE OUT ${targetUser.username}'s account identity? This data removal command is absolute!`);
    if (confirmed) {
      setTimeout(async () => {
        try {
          // @ts-ignore
          await adminDeleteUser(targetUser.uid, targetUser.referralCode || '');
          setEditingUser(null); 
          await loadData(); 
          showAlert('WIPED', 'Account document node has been completely cleared.');
        } catch (err: any) {
          Alert.alert("Wiping Interrupted", err.message);
        }
      }, 300);
    }
  };

  if (!user || !isSuperAdmin(user.email)) return null;

  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    if (showVipOnly) {
      const vipLevel = parseInt(u.vip_level?.toString()) || 0;
      return matchesSearch && vipLevel > 0;
    }
    return matchesSearch;
  });

  const handleApprove = (tx: any) => {
    if (!tx || !tx.id) {
      Alert.alert("Error 01", "Transaction ID is missing!");
      return;
    }
    if (processingId !== null) return;

    Alert.alert("MASTER COMMAND", `Are you sure you want to approve $${tx.amount} for ${tx.username}?`, [
      { text: "STOP", style: "cancel" },
      { text: "EXECUTE", onPress: async () => {
        if (processingId !== null) return;
        try {
          setProcessingId(tx.id);
          const txRef = ref(db, `transactions/${tx.id}`);
          const checkSnap = await get(txRef);
          if (checkSnap.exists()) {
            const currentStatus = (checkSnap.val().status || '').toLowerCase();
            if (currentStatus === 'completed' || currentStatus === 'approved' || currentStatus === 'success') {
              showAlert('BLOCKED', 'Security Alert: This transaction was already processed! Operation denied.');
              return;
            }
          }

          await update(txRef, { status: 'Completed' });

          if (tx.type === 'Deposit' && tx.userId) {
            const userRef = ref(db, `users/${tx.userId}`);
            const userSnap = await get(userRef);

            if (userSnap.exists()) {
              const oldBal = parseFloat(userSnap.val().balance?.toString()) || 0;
              const newBal = oldBal + parseFloat(tx.amount.toString());

              await update(userRef, { balance: newBal });
              await recordFinancialTransaction(tx.userId, tx.username, tx.amount);
            }
          }

          await loadData();
          showAlert('SUCCESS', `Successfully injected funds and cleared order.`);
        } catch (error: any) {
          Alert.alert("System Crash", error.message);
        } finally {
          setProcessingId(null);
        }
      }}
    ]);
  };

  const handleReject = (txId: string) => {
    if (processingId !== null) return;
    Alert.alert("REJECT", "Decline this operation?", [
      { text: "No" },
      { text: "Yes", onPress: async () => {
          if (processingId !== null) return;
          try {
            setProcessingId(txId);
            const txRef = ref(db, `transactions/${txId}`);
            const checkSnap = await get(txRef);
            if (checkSnap.exists() && checkSnap.val().status === 'Completed') {
              showAlert('BLOCKED', 'Too late! This transaction is already completed.');
              return;
            }

            await update(txRef, { status: 'Rejected' });
            await loadData();
            showAlert('REJECTED', 'Order discarded successfully.');
          } catch (e: any) { 
            Alert.alert("Reject Fail", e.message); 
          } finally {
            setProcessingId(null);
          }
      }}
    ]);
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'approved' || s === 'success') return Colors.success || '#2ecc71';
    if (s === 'rejected' || s === 'failed') return Colors.danger || '#e74c3c';
    return '#FFD700'; 
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <View>
            <Text style={styles.hSub}>MASTER COMMAND</Text>
            <Text style={styles.hTitle}>NoirWealth <Text style={{color: Colors.gold}}>Master</Text></Text>
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
              onPress={() => { 
                setActiveTab(t as any); 
                if (t !== 'users') setShowVipOnly(false);
              }} 
              style={[styles.tab, activeTab === t && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, activeTab === t && { color: '#000' }]}>{t.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, width: '100%' }}>
        {isLoading && !isRefreshing ? (
          <View style={styles.center}><ActivityIndicator size="large" color={Colors.gold} /></View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', width: '100%' }}>
            <View style={{ flex: 1, width: '100%', maxWidth: 850 }}>
              
              {activeTab === 'overview' && (
                <ScrollView 
                  showsVerticalScrollIndicator={false} 
                  contentContainerStyle={styles.scrollContent}
                  refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadData} tintColor={Colors.gold} />}
                >
                  <View style={styles.mainProfitCard}>
                    <View style={styles.glassEffect} />
                    <View style={styles.cardContent}>
                      <Text style={styles.cardLabel}>TOTAL PLATFORM PROFIT (PURE DEPOSITS VOLUME)</Text>
                      <Text style={styles.cardValue}>${stats.platformProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                      <View style={styles.splitGrid}>
                        <View style={styles.splitBox}>
                          <Text style={styles.splitTitle}>LATCHA SHARE (80%)</Text>
                          <Text style={[styles.splitValue, {color: Colors.gold}]}>${stats.latchaShare.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
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
                      { label: 'System Capital', val: allUsers.reduce((sum, u) => sum + (parseFloat(u.balance?.toString()) || 0), 0), color: Colors.gold, icon: '🏦' }
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
                    return (
                      <View style={styles.luxuryReqCard}>
                        <View style={styles.reqTop}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.reqName}>{item.username || 'Unknown User'}</Text>
                            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 4 }}>
                              <View style={[styles.reqBadge, { marginTop: 0, backgroundColor: (item.type || 'Deposit') === 'Deposit' ? '#00FF0015' : '#FF000015' }]}>
                                <Text style={{ color: (item.type || 'Deposit') === 'Deposit' ? '#00FF00' : '#FF0000', fontSize: 10, fontWeight: 'bold' }}>{(item.type || 'Deposit').toUpperCase()}</Text>
                              </View>
                              <Text style={{ color: '#444', fontSize: 11 }}>ID: {item.userId ? item.userId.substring(0,6) : 'N/A'}</Text>
                            </View>
                          </View>
                          <Text style={styles.reqAmount}>${(item.amount || item.value || 0).toLocaleString()}</Text>
                        </View>

                        {item.type === 'Deposit' && (
                          <View style={styles.txidIntelBlock}>
                            <Text style={styles.txidBlockLabel}>TRANSACTION HASH :</Text>
                            <View style={styles.txidRow}>
                              <Text style={styles.txidTextString} numberOfLines={1} selectable>
                                {item.txid || '⚠️ Missing Hash Code'}
                              </Text>
                              {item.txid && (
                                <Pressable 
                                  style={styles.txidMiniCopyBtn}
                                  onPress={async () => {
                                    await Clipboard.setStringAsync(item.txid);
                                    showAlert('Copied!', 'TXID Hash copied to admin clipboard.');
                                  }}
                                >
                                  <Text style={{ fontSize: 11 }}>📋</Text>
                                  <Text style={{ color: Colors.gold, fontSize: 10, fontWeight: 'bold' }}>Copy</Text>
                                </Pressable>
                              )}
                            </View>
                          </View>
                        )}
                        
                        {item.proofImageUri && item.proofImageUri !== 'No image/TXID Mode' && (
                          <Pressable style={styles.proofFrame} onPress={() => setPreviewImage(item.proofImageUri || null)} disabled={processingId !== null}>
                            <Image source={{ uri: item.proofImageUri }} style={styles.proofImg} contentFit="cover" />
                            <View style={styles.zoomIndicator}>
                              <Text style={{ fontSize: 12 }}>🔍</Text>
                              <Text style={styles.zoomText}>Click to Zoom</Text>
                            </View>
                          </Pressable>
                        )}

                        <View style={styles.reqActions}>
                          <Pressable 
                            style={[styles.miniBtnRej, processingId !== null && { opacity: 0.4 }]} 
                            onPress={() => handleReject(item.id)}
                            disabled={processingId !== null}
                          >
                            <Text style={{ fontSize: 12, marginRight: 2 }}>❌</Text>
                            <Text style={styles.miniBtnText}>REJECT</Text>
                          </Pressable>
                          
                          <Pressable 
                            style={[styles.miniBtnApp, processingId !== null && { opacity: 0.6 }]} 
                            onPress={() => handleApprove(item)}
                            disabled={processingId !== null}
                          >
                            {isCurrentProcessing ? (
                              <ActivityIndicator size="small" color="#000" />
                            ) : (
                              <>
                                <Text style={{ fontSize: 12, marginRight: 2 }}>✅</Text>
                                <Text style={[styles.miniBtnText, { color: '#000' }]}>APPROVE</Text>
                              </>
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
                    <TextInput 
                      style={styles.searchInput} 
                      placeholder="Search user identity..." 
                      placeholderTextColor="#444" 
                      value={searchQuery} 
                      onChangeText={setSearchQuery} 
                      editable={processingId === null} 
                    />
                  </View>

                  {showVipOnly && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 15, alignItems: 'center' }}>
                      <Text style={{ color: '#00EAFF', fontSize: 12, fontWeight: 'bold' }}>💎 Showing VIP Holders Only ({filteredUsers.length})</Text>
                      <Pressable onPress={() => setShowVipOnly(false)} disabled={processingId !== null}>
                        <Text style={{ color: Colors.gold, fontSize: 12, fontWeight: 'bold', textDecorationLine: 'underline' }}>Clear Filter</Text>
                      </Pressable>
                    </View>
                  )}

                  <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item.uid}
                    contentContainerStyle={styles.listPadding}
                    renderItem={({ item }) => {
                      const tier = getVIPTier(item.vip_level || 0);
                      const totalReferredCount = allUsers.filter(u => u.referredBy === item.uid).length;
                      const networkEarnings = historyTxs
                        .filter(t => t.userId === item.uid && t.type === 'Referral Bonus')
                        .reduce((sum, t) => sum + (parseFloat(t.amount || 0) || 0), 0);

                      return (
                        <View style={styles.userEliteCard}>
                          <View style={[styles.uAvatar, { borderColor: tier.color }]}>
                            {item.profileImage ? (
                              <Image source={{ uri: item.profileImage }} style={{ width: '100%', height: '100%', borderRadius: 24 }} />
                            ) : (
                              <Text style={{ color: tier.color, fontWeight: 'bold' }}>{item.username ? item.username[0].toUpperCase() : 'U'}</Text>
                            )}
                          </View>
                          <View style={{ flex: 1, marginLeft: 15 }}>
                            <Text style={styles.uName}>{item.username}</Text>
                            <Text style={styles.uEmail}>{item.email}</Text>
                            
                            <View style={styles.uBadgeRow}>
                               <Text style={[styles.uVipTag, { color: tier.color }]}>VIP {item.vip_level}</Text>
                               <Text style={styles.uBalanceTag}>${(parseFloat(item.balance?.toString()) || 0).toFixed(2)}</Text>
                            </View>

                            <View style={styles.uNetworkIntelRow}>
                              <View style={styles.uNetworkStatItem}>
                                <Text style={{ fontSize: 11 }}>👥</Text>
                                <Text style={styles.uNetworkStatText}>Refs: <Text style={{color: '#fff', fontWeight: 'bold'}}>{totalReferredCount}</Text></Text>
                              </View>
                              <View style={styles.uNetworkStatDivider} />
                              <View style={styles.uNetworkStatItem}>
                                <Text style={{ fontSize: 11 }}>🎁</Text>
                                <Text style={styles.uNetworkStatText}>Earned: <Text style={{color: Colors.gold, fontWeight: 'bold'}}>${networkEarnings.toFixed(2)}</Text></Text>
                              </View>
                            </View>
                          </View>
                          <Pressable style={styles.uEditBtn} disabled={processingId !== null} onPress={() => { setEditingUser(item); setNewBalance(item.balance?.toString() || '0'); setNewVip(item.vip_level || 0); }}>
                            <Text style={{ fontSize: 14 }}>⚙️</Text>
                          </Pressable>
                        </View>
                      );
                    }}
                  />
                </View>
              )}

              {/* 🛡️ التعديل هنا: زدنا overflow: 'hidden' باش نمنعوا الشاشة تتزومى ولا تخرج على الإطار */}
              {activeTab === 'historique' && (
                <View style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
                  
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={styles.historyFilterScroll}
                    contentContainerStyle={styles.historyFilterBar}
                  >
                    {['ALL', 'Deposit', 'Withdrawal', 'Reward', 'Referral Bonus', 'VIP Upgrade'].map((f) => (
                      <Pressable 
                        key={f} 
                        onPress={() => handleHistoryFilter(f)} 
                        style={[styles.historyFilterTab, historyFilter === f && { backgroundColor: Colors.gold }]}
                      >
                        <Text style={[styles.historyFilterLabel, historyFilter === f && { color: '#000' }]}>{f.toUpperCase()}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <View style={[styles.searchContainer, { marginTop: 0, marginBottom: 15 }]}>
                    <Text style={{ fontSize: 14, marginRight: 6 }}>🔍</Text>
                    <TextInput 
                      style={styles.searchInput} 
                      placeholder="Search history by username..." 
                      placeholderTextColor="#444" 
                      value={historySearchQuery} 
                      onChangeText={setHistorySearchQuery} 
                      editable={processingId === null} 
                    />
                  </View>

                  <View style={styles.historySummaryCard}>
                    <Text style={styles.hSumTitle}>FILTERED LOGS: <Text style={{color: Colors.gold}}>{filteredHistory.length}</Text></Text>
                    <Text style={styles.hSumValue}>
                      Total Value: ${filteredHistory.reduce((sum, t) => sum + (parseFloat(t.amount || 0) || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </Text>
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
      </Animated.View>

      <Modal visible={!!previewImage} transparent animationType="fade">
        <Pressable style={styles.previewModalOverlay} onPress={() => setPreviewImage(null)}>
          <TouchableOpacity style={styles.previewCloseBtn} onPress={() => setPreviewImage(null)}>
            <Text style={{ fontSize: 32 }}>❌</Text>
          </TouchableOpacity>
          {previewImage && (
            <Image source={{ uri: previewImage }} style={styles.fullPreviewImg} contentFit="contain" />
          )}
        </Pressable>
      </Modal>

      <Modal visible={!!editingUser} transparent animationType="slide">
        <View style={styles.modal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.mContent}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.mContentScrollView}>
              <View style={styles.mHandle} />
              <Text style={styles.mTitle}>Account Intelligence</Text>
              <Text style={styles.mSub}>{editingUser?.username}</Text>

              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: Colors.gold, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', overflow: 'hidden' }}>
                  {editingUser?.profileImage ? (
                    <Image source={{ uri: editingUser.profileImage }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Text style={{ fontSize: 24 }}>👤</Text>
                  )}
                </View>
              </View>

              <View style={styles.intelBox}>
                <Text style={styles.intelTitle}>🔒 USER CREDENTIALS & METRICS</Text>
                
                <View style={styles.intelRow}>
                  <Text style={styles.intelLabel}>User UID:</Text>
                  <Text style={styles.intelVal}>{editingUser?.uid}</Text>
                </View>

                <View style={styles.intelRow}>
                  <Text style={styles.intelLabel}>Email ID:</Text>
                  <Text style={styles.intelVal}>{editingUser?.email}</Text>
                </View>

                <View style={styles.intelRow}>
                  <Text style={styles.intelLabel}>Phone Contact:</Text>
                  <Text style={styles.intelVal}>{editingUser?.phone || 'Not Linked'}</Text>
                </View>

                <View style={styles.intelRow}>
                  <Text style={styles.intelLabel}>Joined Date:</Text>
                  <Text style={styles.intelVal}>{editingUser?.createdAt ? new Date(editingUser.createdAt).toLocaleDateString() : 'N/A'}</Text>
                </View>

                <View style={styles.intelRow}>
                  <Text style={styles.intelLabel}>Referred By:</Text>
                  <Text style={[styles.intelVal, {color: Colors.gold}]}>{editingUser?.referredBy || 'Direct Registration'}</Text>
                </View>

                <View style={styles.intelRow}>
                  <Text style={styles.intelLabel}>Verification:</Text>
                  <Text style={[styles.intelVal, {color: editingUser?.isFullyVerified ? Colors.success : '#e74c3c'}]}>
                    {editingUser?.isFullyVerified ? 'Verified KYC 🛡️' : 'Unverified Account'}
                  </Text>
                </View>

                <View style={[styles.intelRow, {borderBottomWidth: 0}]}>
                  <Text style={styles.intelLabel}>Referral Code:</Text>
                  <Text style={[styles.intelVal, {color: Colors.gold, fontWeight: 'bold'}]}>{editingUser?.referralCode || 'NONE'}</Text>
                </View>
              </View>

              <Text style={[styles.mLabel, { marginTop: 10 }]}>MODIFY USER LIQUID BALANCE ($)</Text>
              <TextInput style={styles.mInput} value={newBalance} onChangeText={setNewBalance} keyboardType="decimal-pad" />
              
              <Text style={styles.mLabel}>OVERRIDE VIP MEMBERSHIP TIER</Text>
              <View style={styles.vipPicker}>
                   {[0,1,2,3,4,5,6].map(lvl => (
                     <Pressable key={lvl} onPress={()=>setNewVip(lvl)} style={[styles.vipOpt, newVip === lvl && {backgroundColor: Colors.gold, borderColor: Colors.gold}]}>
                       <Text style={[styles.vipOptText, newVip === lvl && {color: '#000'}]}>V{lvl}</Text>
                     </Pressable>
                   ))}
              </View>

              <TouchableOpacity 
                style={{
                  flexDirection: 'row', 
                  backgroundColor: 'rgba(255, 77, 77, 0.08)',
                  padding: 16,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 77, 77, 0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  marginBottom: 20,
                  marginTop: 5
                }} 
                onPress={() => handleDeleteUserExecution(editingUser)}
              >
                <Text style={{ fontSize: 16 }}>🗑️</Text>
                <Text style={{ color: '#ff4d4d', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 }}>
                  DELETE THIS ACCOUNT NODE
                </Text>
              </TouchableOpacity>

              <View style={styles.mActions}>
                <Pressable style={styles.mBtnC} onPress={() => setEditingUser(null)}><Text style={{ color: '#fff' }}>Discard</Text></Pressable>
                <Pressable style={styles.mBtnS} onPress={async () => {
                  await adminUpdateUserBalance(editingUser.uid, parseFloat(newBalance) || 0);
                  await adminSetVIP(editingUser.uid, newVip);
                  setEditingUser(null); loadData();
                  showAlert('Success', 'Profile updated.');
                }}><Text style={{ color: '#000', fontWeight: 'bold' }}>Update Profile</Text></Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000', alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { width: '100%', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25, width: '100%', maxWidth: 850 },
  hSub: { color: '#333', fontSize: 10, fontWeight: 'bold', letterSpacing: 2 },
  hTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  refreshBtn: { padding: 5, justifyContent: 'center', alignItems: 'center' },
  
  tabBarContainer: { width: '100%', alignItems: 'center' },
  tabBar: { flexDirection: 'row', backgroundColor: '#050505', borderRadius: 20, padding: 5, borderWidth: 1, borderColor: '#111', marginBottom: 15, width: '90%', maxWidth: 850 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  tabActive: { backgroundColor: Colors.gold },
  tabLabel: { color: '#444', fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  
  scrollContent: { padding: 20, paddingBottom: 50 },
  mainProfitCard: { height: 200, borderRadius: 30, overflow: 'hidden', marginBottom: 25, borderWidth: 1, borderColor: '#151515', width: '100%' },
  glassEffect: { ...StyleSheet.absoluteFillObject, backgroundColor: '#080808', opacity: 0.8 },
  cardContent: { flex: 1, padding: 25, justifyContent: 'center', alignItems: 'center' },
  cardLabel: { color: '#333', fontSize: 9, fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 },
  cardValue: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
  splitGrid: { flexDirection: 'row', marginTop: 25, width: '100%', alignItems: 'center' },
  splitBox: { flex: 1, alignItems: 'center' },
  splitTitle: { color: '#222', fontSize: 8, fontWeight: 'bold', marginBottom: 4 },
  splitValue: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  splitDivider: { width: 1, height: 30, backgroundColor: '#111' },
  commandGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 25, width: '100%', justifyContent: 'space-between' },
  commandTile: { width: '48%', backgroundColor: '#080808', padding: 20, borderRadius: 25, borderWidth: 1, borderColor: '#111', gap: 8 },
  tileVal: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  tileLabel: { color: '#333', fontSize: 9, fontWeight: 'bold' },
  sectionTitle: { color: '#333', fontSize: 10, fontWeight: 'bold', marginTop: 10, marginBottom: 15, marginLeft: 10, letterSpacing: 1.5 },
  financeBox: { backgroundColor: '#080808', borderRadius: 25, padding: 5, borderWidth: 1, borderColor: '#111', width: '100%' },
  fRow: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#050505' },
  fLabel: { flex: 1, color: '#666', fontSize: 13, marginLeft: 12 },
  fVal: { fontWeight: 'bold', fontSize: 15 },
  luxuryReqCard: { backgroundColor: '#080808', marginBottom: 15, borderRadius: 25, padding: 20, borderWidth: 1, borderColor: '#151515', width: '100%' },
  reqTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reqName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  reqBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 5 },
  reqAmount: { color: Colors.gold, fontSize: 22, fontWeight: 'bold' },
  proofFrame: { width: '100%', height: 240, borderRadius: 20, overflow: 'hidden', marginTop: 15, borderWidth: 1, borderColor: '#111', position: 'relative' },
  proofImg: { width: '100%', height: '100%' },
  zoomIndicator: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.7)', flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#222' },
  zoomText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  previewModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.98)', justifyContent: 'center', alignItems: 'center' },
  previewCloseBtn: { position: 'absolute', top: 50, right: 25, zIndex: 100, padding: 5 },
  fullPreviewImg: { width: '95%', height: '85%' },
  reqActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  miniBtnApp: { flex: 2, backgroundColor: Colors.gold, flexDirection: 'row', padding: 15, borderRadius: 15, justifyContent: 'center', alignItems: 'center', gap: 8 },
  miniBtnRej: { flex: 1, backgroundColor: '#111', flexDirection: 'row', padding: 15, borderRadius: 15, justifyContent: 'center', alignItems: 'center', gap: 8 },
  miniBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  
  // 🛡️ التعديل الأول: أضفنا maxWidth: '100%' باش شريط البحث ما يكبرش بزاف
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', marginVertical: 20, paddingHorizontal: 15, borderRadius: 15, borderWidth: 1, borderColor: '#151515', width: '100%', maxWidth: '100%' },
  searchInput: { flex: 1, padding: 15, color: '#fff' },
  userEliteCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', marginBottom: 10, padding: 18, borderRadius: 25, borderWidth: 1, borderColor: '#111', width: '100%' },
  uAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  uName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  uEmail: { color: '#444', fontSize: 11, marginBottom: 5 },
  uBadgeRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  uVipTag: { fontSize: 10, fontWeight: 'bold' },
  uBadgeLabel: { color: '#333', fontSize: 9, fontWeight: 'bold' },
  uBalanceTag: { color: Colors.gold, fontSize: 11, fontWeight: 'bold' },
  uEditBtn: { padding: 12, backgroundColor: '#050505', borderRadius: 15, borderWidth: 1, borderColor: '#151515', justifyContent: 'center', alignItems: 'center' },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'flex-end', alignItems: 'center', width: '100%' },
  mContent: { backgroundColor: '#080808', padding: 30, borderTopLeftRadius: 35, borderTopRightRadius: 35, borderWidth: 1, borderColor: '#1A1A1A', maxHeight: '90%', width: '100%', maxWidth: 700 },
  mContentScrollView: { paddingBottom: 30 },
  mHandle: { width: 40, height: 4, backgroundColor: '#222', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  mTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  mSub: { color: Colors.gold, fontSize: 12, textAlign: 'center', marginBottom: 25, fontWeight: 'bold' },
  mLabel: { color: '#444', fontSize: 10, fontWeight: 'bold', marginBottom: 10, letterSpacing: 1 },
  mInput: { backgroundColor: '#000', color: Colors.gold, padding: 18, borderRadius: 15, fontSize: 22, fontWeight: 'bold', borderWidth: 1, borderColor: '#111', textAlign: 'center', marginBottom: 25 },
  vipPicker: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 35, width: '100%' },
  vipOpt: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#111' },
  vipOptText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  mActions: { flexDirection: 'row', gap: 12, marginTop: 10, width: '100%' },
  mBtnS: { flex: 2, backgroundColor: Colors.gold, padding: 18, borderRadius: 15, alignItems: 'center' },
  mBtnC: { flex: 1, backgroundColor: '#111', padding: 18, borderRadius: 15, alignItems: 'center' },
  listPadding: { paddingBottom: 150, width: '100%' },
  emptyText: { color: '#444', textAlign: 'center', marginTop: 50, fontWeight: 'bold' },

  // 🛡️ التعديل الثاني والأساسي: مسحنا `flexShrink: 0` اللّي كانت تخلي الأزرار تخرج عن الشاشة وتزوميها
  historyFilterScroll: { height: 55, marginBottom: 15, width: '100%', maxWidth: '100%' },
  historyFilterBar: { paddingHorizontal: 10, alignItems: 'center', flexDirection: 'row' },
  historyFilterTab: { backgroundColor: '#080808', paddingHorizontal: 14, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#111', marginRight: 8 },
  historyFilterLabel: { color: '#888', fontSize: 10, fontWeight: 'bold' },
  historySummaryCard: { backgroundColor: '#050505', borderRadius: 15, padding: 15, borderWidth: 1, borderColor: '#111', marginBottom: 15, width: '100%' },
  
  hSumTitle: { color: '#666', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  hSumValue: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 5 },
  historyLogCard: { backgroundColor: '#080808', marginBottom: 10, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#111', width: '100%' },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logUser: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  logNote: { color: '#555', fontSize: 11, marginTop: 4, lineHeight: 16 },
  logAmount: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  logStatus: { fontSize: 9, fontWeight: 'black', marginTop: 4, letterSpacing: 0.5 },
  logFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: '#030303', paddingTop: 10 },
  logTypeTag: { color: Colors.gold, backgroundColor: '#161204', fontSize: 9, fontWeight: 'bold', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, overflow: 'hidden' },
  logDate: { color: '#333', fontSize: 10, fontWeight: 'bold' },
  intelBox: { backgroundColor: '#000', borderRadius: 20, padding: 15, borderWidth: 1, borderColor: '#111', marginBottom: 20, width: '100%' },
  intelTitle: { color: Colors.gold, fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#080808', paddingBottom: 8 },
  intelRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#050505' },
  intelLabel: { color: '#555', fontSize: 12, fontWeight: '600' },
  intelVal: { color: '#fff', fontSize: 12, fontWeight: '700', maxWidth: '65%', textAlign: 'right' },

  txidIntelBlock: { backgroundColor: '#020202', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#121212', marginTop: 15, gap: 5, width: '100%' },
  txidBlockLabel: { color: '#444', fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },
  txidRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  txidTextString: { flex: 1, color: Colors.gold, fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' },
  txidMiniCopyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(212, 175, 55, 0.05)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.15)' },

  uNetworkIntelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#030303', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#121212', alignSelf: 'flex-start', gap: 8 },
  uNetworkStatItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  uNetworkStatText: { color: '#666', fontSize: 11, fontWeight: '500' },
  uNetworkStatDivider: { width: 1, height: 10, backgroundColor: '#222' }
});