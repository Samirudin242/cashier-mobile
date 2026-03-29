import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Save, X } from 'lucide-react-native';
import { AppScreen, AppCard, AppText, AppInput, AppButton } from '../../components/ui';
import { userRepository } from '../../repositories/userRepository';
import { colors, spacing } from '../../config/theme';

export function EmployeeFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editId = route.params?.employeeId as string | undefined;

  const [form, setForm] = useState({
    name: '',
    accessCode: '',
    dailySalary: '',
    bonusPercent: '10',
    allowance: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editId) {
      (async () => {
        const emp = await userRepository.getById(editId);
        if (emp) {
          setForm({
            name: emp.name,
            accessCode: emp.access_code,
            dailySalary: String(emp.daily_salary),
            bonusPercent: String(emp.bonus_percent ?? 10),
            allowance: emp.allowance ? String(emp.allowance) : '',
          });
        }
      })();
    }
  }, [editId]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validasi', 'Nama karyawan wajib diisi');
      return;
    }
    if (!editId && !form.accessCode.trim()) {
      Alert.alert('Validasi', 'Kode akses wajib diisi');
      return;
    }
    const salary = parseFloat(form.dailySalary) || 0;
    const bonusPct = parseFloat(form.bonusPercent) || 0;
    const allowanceRaw = form.allowance.trim();
    const allowance = allowanceRaw === '' ? 0 : parseFloat(allowanceRaw) || 0;

    setLoading(true);
    try {
      if (editId) {
        await userRepository.updateEmployee(editId, {
          name: form.name.trim(),
          dailySalary: salary,
          bonusPercent: bonusPct,
          allowance,
        });
      } else {
        const existingLocal = await userRepository.findByAccessCode(form.accessCode);
        if (existingLocal) {
          Alert.alert('Kesalahan', 'Kode akses sudah digunakan di perangkat ini');
          setLoading(false);
          return;
        }
        const existingCloud = await userRepository.findByAccessCodeFromSupabase(form.accessCode.trim().toUpperCase());
        if (existingCloud?.is_active) {
          Alert.alert('Kesalahan', 'Kode akses sudah dipakai karyawan aktif di server. Gunakan kode lain.');
          setLoading(false);
          return;
        }
        await userRepository.createEmployee({
          name: form.name.trim(),
          accessCode: form.accessCode.trim(),
          dailySalary: salary,
          bonusPercent: bonusPct,
          allowance,
        });
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Kesalahan', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen scroll padded>
      <AppCard style={styles.card}>
        <AppInput
          label="Nama Karyawan"
          placeholder="cth. Ahmad"
          value={form.name}
          onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
        />
        <AppInput
          label="Kode Akses"
          placeholder="cth. KASIR004"
          value={form.accessCode}
          onChangeText={(v) => setForm((p) => ({ ...p, accessCode: v }))}
          autoCapitalize="characters"
          editable={!editId}
        />
        <AppInput
          label="Gaji per Hari (Rp)"
          placeholder="0"
          value={form.dailySalary}
          onChangeText={(v) => setForm((p) => ({ ...p, dailySalary: v }))}
          keyboardType="numeric"
        />
        <AppInput
          label="Persentase Bonus (%)"
          placeholder="cth. 10"
          value={form.bonusPercent}
          onChangeText={(v) => setForm((p) => ({ ...p, bonusPercent: v }))}
          keyboardType="numeric"
        />
        <AppInput
          label="Tunjangan per bulan (Rp, opsional)"
          placeholder="Kosongkan jika tidak ada"
          value={form.allowance}
          onChangeText={(v) => setForm((p) => ({ ...p, allowance: v }))}
          keyboardType="numeric"
        />
        <AppText variant="captionMuted" style={styles.bonusHint}>
          Dihitung dari ((harga jual − harga modal) − biaya penanganan) × jumlah terjual × persen di atas.
        </AppText>
      </AppCard>

      <View style={styles.actions}>
        <AppButton
          title={editId ? 'Perbarui Karyawan' : 'Simpan Karyawan'}
          onPress={handleSave}
          loading={loading}
          fullWidth
          size="lg"
          icon={<Save size={18} color={colors.textInverse} />}
        />
        <AppButton
          title="Batal"
          onPress={() => navigation.goBack()}
          variant="outline"
          fullWidth
          size="lg"
          style={styles.cancelBtn}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bonusHint: {
    marginTop: spacing.sm,
  },
  card: {
    padding: spacing.lg,
    marginTop: spacing.base,
  },
  actions: {
    marginTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  cancelBtn: {
    marginTop: spacing.sm,
  },
});
