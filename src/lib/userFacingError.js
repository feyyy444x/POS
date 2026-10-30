const ERROR_MESSAGES = [
  [/super admin access required|verifikasi pin diperlukan|pin verification required/i, 'Verifikasi PIN Super Admin diperlukan sebelum menjalankan tindakan ini. Buka verifikasi PIN lalu coba lagi.'],
  [/row-level security|permission denied|not authorized|insufficient privilege|\b42501\b/i, 'Akses tidak diizinkan. Periksa hak akses akun atau hubungi admin.'],
  [/network|fetch failed|failed to fetch|connection|timeout|timed out|\b5\d\d\b/i, 'Koneksi sedang bermasalah. Periksa internet lalu coba lagi.'],
  [/duplicate key|unique constraint|already exists|\b23505\b/i, 'Data serupa sudah ada. Periksa kembali sebelum menyimpan.'],
  [/foreign key|violates.*constraint|check constraint|invalid input syntax|\b22\w{3}\b/i, 'Data belum sesuai aturan. Periksa kembali isian yang kamu masukkan.'],
  [/schema cache|relation .* does not exist|table .* does not exist|could not find the table|\b42p01\b/i, 'Fitur belum siap digunakan. Hubungi admin untuk memeriksa konfigurasi sistem.'],
  [/jwt|token.*expired|invalid.*token|not authenticated|\b401\b/i, 'Sesi kamu sudah berakhir. Masuk kembali lalu coba lagi.'],
]

export function userFacingError(error, fallback = 'Permintaan belum berhasil diproses. Coba lagi; jika masalah berlanjut, hubungi admin.') {
  const raw = typeof error === 'string' ? error : error?.message || error?.details || ''
  if (/cashier_shifts_cashier_id_fkey|cashier_shift_breaks_cashier_id_fkey|cashier_manual_alerts_(cashier_id|sent_by)_fkey/i.test(raw)) {
    return 'Penghapusan tertahan oleh referensi riwayat kasir. Migrasi perbaikan penghapusan akun belum diterapkan pada database ini; riwayat transaksi tidak dihapus. Hubungi admin untuk menerapkan migrasi dengan aman.'
  }
  for (const [pattern, message] of ERROR_MESSAGES) {
    if (pattern.test(raw)) return message
  }
  return fallback
}
