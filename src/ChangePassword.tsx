import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useGlobal } from '../GlobalContext';

/* =====================
   2026-11-10 08:59:30 baya 
   API : POST api/UserPassword/ChangePassword 
===================== */

const { width } = Dimensions.get('window');
const scale = (size: number) => (width / 375) * size;

const checkRules = (pwd: string, userCode: string) => ({
  length: pwd.length >= 8,
  upper: /[A-Z]/.test(pwd),
  lower: /[a-z]/.test(pwd),
  digit: /[0-9]/.test(pwd),
  special: /[^A-Za-z0-9]/.test(pwd),
  noUser:
    userCode === '' || !pwd.toLowerCase().includes(userCode.toLowerCase()),
});

export default function ChangePassword({ navigation, route }: any) {
  const { gsURL, gs_factoryCode, gs_factoryindex } = useGlobal();

  const userCode: string = route?.params?.userCode || '';
  const userName: string = route?.params?.userName || '';
  const reason: string = route?.params?.reason || 'MENU';
  const forced: boolean = route?.params?.forced === true;
  const startMessage: string = route?.params?.message || '';

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [loading, setLoading] = useState(false);
  const busyRef = useRef(false);

  const newRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const rules = useMemo(
    () => checkRules(newPassword, userCode),
    [newPassword, userCode],
  );
  const rulesOk = Object.values(rules).every(v => v);
  const sameOk = newPassword !== '' && newPassword === confirmPassword;

  const mainColor = gs_factoryindex === 'zentech' ? '#06b86c' : '#0052cc';

  const handleSave = async () => {
    if (busyRef.current) return;

    setErrorText('');

    if (oldPassword === '') {
      setErrorText('Please enter the old password');
      return;
    }
    if (!rulesOk) {
      setErrorText('The new password does not follow the rules');
      return;
    }
    if (!sameOk) {
      setErrorText('The new password and the confirmation are not the same');
      return;
    }
    if (oldPassword === newPassword) {
      setErrorText('Old and new passwords cannot be the same');
      return;
    }

    busyRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`${gsURL}/api/UserPassword/ChangePassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factoryCode: gs_factoryCode,
          userCode: userCode,
          oldPassword: oldPassword,
          newPassword: newPassword,
          confirmPassword: confirmPassword,
          reason: reason,
          pcName: 'PDA',
        }),
      });

      const data = await res.json();

      if (data.Code === 500) {
        setErrorText(data.Message || 'Server error');
        return;
      }
      if (data.code !== 200 || !data.data) {
        setErrorText(data.message || 'Server error');
        return;
      }

      if (data.data.isok !== '1') {
        setErrorText(data.data.message || 'Password not changed');
        setOldPassword('');
        return;
      }

      Alert.alert(
        'Success',
        forced
          ? `${data.data.message}\nPlease login with the new password.`
          : data.data.message,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      setErrorText('Server not reachable');
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  const ruleRow = (ok: boolean, text: string) => (
    <Text style={[styles.ruleText, { color: ok ? '#16a34a' : '#94a3b8' }]}>
      {ok ? '✓' : '•'} {text}
    </Text>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={mainColor} />

      <LinearGradient
        colors={
          gs_factoryindex === 'zentech'
            ? ['#06b86c', '#048a50']
            : ['#f391f7ff', '#0052cc']
        }
        start={{ x: 1, y: 1 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Image
              source={require('../assets/logo/left.png')}
              style={styles.returnLogo}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change Password</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.userText}>
          {userCode} {userName ? `- ${userName}` : ''}
        </Text>

        {startMessage ? (
          <Text style={styles.warningText}>{startMessage}</Text>
        ) : null}

        <Text style={styles.label}>Old password</Text>
        <TextInput
          style={[styles.input, { borderColor: mainColor }]}
          value={oldPassword}
          onChangeText={t => {
            setOldPassword(t);
            setErrorText('');
          }}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => newRef.current?.focus()}
          editable={!loading}
        />

        <Text style={styles.label}>New password</Text>
        <TextInput
          ref={newRef}
          style={[styles.input, { borderColor: mainColor }]}
          value={newPassword}
          onChangeText={t => {
            setNewPassword(t);
            setErrorText('');
          }}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          editable={!loading}
        />

        <Text style={styles.label}>Confirm new password</Text>
        <TextInput
          ref={confirmRef}
          style={[styles.input, { borderColor: mainColor }]}
          value={confirmPassword}
          onChangeText={t => {
            setConfirmPassword(t);
            setErrorText('');
          }}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleSave}
          editable={!loading}
        />

        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          activeOpacity={0.7}
        >
          <Text style={[styles.showText, { color: mainColor }]}>
            {showPassword ? 'Hide passwords' : 'Show passwords'}
          </Text>
        </TouchableOpacity>

        <View style={styles.rulesBox}>
          {ruleRow(rules.length, 'At least 8 characters')}
          {ruleRow(rules.upper, 'One uppercase letter (A-Z)')}
          {ruleRow(rules.lower, 'One lowercase letter (a-z)')}
          {ruleRow(rules.digit, 'One digit (0-9)')}
          {ruleRow(rules.special, 'One special character (@ # * - ...)')}
          {ruleRow(rules.noUser, 'Does not contain the user code')}
          {ruleRow(sameOk, 'Confirmation is the same')}
        </View>

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: mainColor },
            loading && { opacity: 0.6 },
          ]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: width * 0.05,
    height: scale(56),
    flexDirection: 'row',
    alignItems: 'center',
  },
  returnLogo: {
    width: scale(24),
    height: scale(24),
    marginRight: 10,
    tintColor: '#FFFFFF',
  },
  headerTitle: { color: '#FFFFFF', fontSize: scale(16), fontWeight: '900' },
  content: { padding: 16 },
  userText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b45309',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1E293B',
  },
  showText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'right',
  },
  rulesBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginTop: 12,
  },
  ruleText: { fontSize: 13, fontWeight: '600', marginVertical: 2 },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 10,
  },
  saveButton: {
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
});
