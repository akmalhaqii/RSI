<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

final class EvaluationQuestions
{
    private const BANKS = [
        'assessment' => [
            ['Langkah pertama sebelum menganalisis laporan operasional adalah...', ['Memeriksa kelengkapan dan validitas data', 'Langsung menyimpulkan hasil', 'Menghapus data yang berbeda', 'Mengubah angka agar sesuai target', 'Membagikan data tanpa izin'], 0],
            ['Sumber data yang paling tepat untuk laporan stok adalah...', ['Perkiraan pribadi', 'Catatan stok yang telah diverifikasi', 'Pesan tidak resmi', 'Data lama tanpa pembaruan', 'Angka dari internet'], 1],
            ['Saat menemukan selisih stok, tindakan yang tepat adalah...', ['Mengabaikannya', 'Menutupi selisih', 'Melakukan verifikasi fisik dan pencatatan', 'Menyalahkan rekan kerja', 'Mengubah laporan tanpa bukti'], 2],
            ['Indikator kinerja atau KPI digunakan untuk...', ['Mengukur pencapaian sasaran kerja', 'Menggantikan semua prosedur', 'Menentukan pendapat pribadi', 'Menghapus kebutuhan evaluasi', 'Membatasi komunikasi'], 0],
            ['Jika laporan berisi data pribadi karyawan, Anda harus...', ['Mengunggahnya ke media sosial', 'Mengirimnya ke semua kontak', 'Menyimpan di perangkat umum', 'Membatasi akses sesuai kewenangan', 'Mencetak tanpa pengawasan'], 3],
            ['Prioritas pekerjaan sebaiknya ditetapkan berdasarkan...', ['Urutan pesan yang disukai', 'Urgensi, dampak, dan tenggat', 'Pendapat tanpa data', 'Pekerjaan paling mudah saja', 'Permintaan yang paling akhir'], 1],
            ['Laporan kerja yang efektif sebaiknya...', ['Panjang tanpa struktur', 'Berisi opini saja', 'Tidak mencantumkan sumber', 'Menghindari angka', 'Ringkas, akurat, dan menyertakan tindak lanjut'], 4],
            ['Anda melihat tumpukan palet yang tidak stabil di jalur forklift. Tindakan yang sesuai prosedur K3 adalah...', ['Melanjutkan pekerjaan karena bukan area tanggung jawab Anda', 'Merapikan sendiri tanpa alat pelindung diri', 'Mengamankan area dan segera melapor ke supervisor atau petugas K3', 'Mendokumentasikan untuk dibagikan di grup obrolan', 'Menunggu hingga akhir shift untuk melapor'], 2],
            ['Saat menerima instruksi yang belum jelas, Anda sebaiknya...', ['Menebak maksudnya', 'Menunda tanpa kabar', 'Mengabaikan instruksi', 'Meminta klarifikasi kepada pemberi instruksi', 'Menyebarkan kebingungan'], 3],
            ['Tren keterlambatan pengiriman sebaiknya dianalisis dengan...', ['Membandingkan data waktu dan penyebab secara konsisten', 'Memilih satu kasus saja', 'Menghilangkan data terlambat', 'Mengubah target setelah kejadian', 'Menggunakan ingatan tanpa catatan'], 0],
            ['Tindak lanjut hasil evaluasi kompetensi adalah...', ['Menyimpan hasil tanpa dibaca', 'Menyusun rencana pengembangan sesuai kesenjangan', 'Mengabaikan area peningkatan', 'Menghapus hasil penilaian', 'Mengulang jawaban yang sama'], 1],
            ['Saat menyelesaikan tugas tim, sikap yang tepat adalah...', ['Menahan informasi penting', 'Mengambil semua keputusan sendiri', 'Mengabaikan tenggat', 'Menunggu tanpa berkoordinasi', 'Berkoordinasi dan melaporkan progres secara transparan'], 4],
        ],
        'inventory' => [
            ['Tujuan utama pengelolaan persediaan adalah...', ['Menambah stok tanpa batas', 'Menyeimbangkan ketersediaan dan biaya', 'Menghapus semua catatan', 'Menghindari perhitungan stok', 'Membeli tanpa perencanaan'], 1],
            ['Data dasar untuk menghitung kebutuhan stok adalah...', ['Warna kemasan', 'Nama petugas saja', 'Riwayat permintaan dan waktu pengadaan', 'Lokasi rapat', 'Jumlah email'], 2],
            ['Safety stock berfungsi untuk...', ['Mengantisipasi ketidakpastian permintaan atau pasokan', 'Menggantikan pencatatan', 'Menambah barang rusak', 'Menghilangkan gudang', 'Menunda pengiriman'], 0],
            ['Reorder point menunjukkan...', ['Tanggal rapat', 'Harga jual', 'Nama pemasok', 'Tingkat stok untuk melakukan pemesanan ulang', 'Biaya perjalanan'], 3],
            ['Saat stok fisik berbeda dari sistem, tindakan tepat adalah...', ['Mengabaikan selisih', 'Mengubah angka tanpa bukti', 'Melakukan rekonsiliasi dan pemeriksaan', 'Menghapus data', 'Menyalahkan pelanggan'], 2],
            ['Lead time adalah...', ['Lama waktu dari pemesanan hingga penerimaan', 'Lama jam istirahat', 'Usia karyawan', 'Jumlah jenis produk', 'Nilai stok akhir'], 0],
            ['Analisis ABC mengelompokkan persediaan berdasarkan...', ['Warna barang', 'Urutan nama', 'Ukuran ruangan', 'Hari pembelian', 'Kontribusi nilai atau tingkat kepentingan'], 4],
            ['Metode peramalan sederhana yang menggunakan rata-rata beberapa periode terakhir disebut...', ['Regresi linier berganda', 'Moving average', 'Analisis SWOT', 'Diagram Pareto', 'Simulasi Monte Carlo'], 1],
        ],
        'communication' => [
            ['Tujuan utama laporan kerja harian adalah...', ['Mencatat seluruh percakapan selama bekerja', 'Menyampaikan progres, kendala, dan tindak lanjut secara ringkas', 'Menunjukkan jumlah jam lembur', 'Menggantikan rapat koordinasi mingguan', 'Membandingkan kinerja dengan rekan kerja'], 1],
            ['Informasi penting dalam laporan kerja adalah...', ['Rumor kantor', 'Pendapat tanpa sumber', 'Hasil, kendala, dan rencana tindak lanjut', 'Percakapan pribadi', 'Daftar hiburan'], 2],
            ['Ketika instruksi belum jelas, sebaiknya...', ['Meminta klarifikasi', 'Mengabaikannya', 'Menebak sendiri', 'Menyebarkan kabar', 'Menunda tanpa informasi'], 0],
            ['Subjek email kerja yang baik adalah...', ['Kosong', 'Sangat umum', 'Hanya tanda seru', 'Spesifik dan sesuai isi pesan', 'Berisi candaan saja'], 3],
            ['Umpan balik yang efektif sebaiknya...', ['Menyerang pribadi', 'Tanpa contoh', 'Disampaikan ke semua orang', 'Menghindari solusi', 'Spesifik, sopan, dan dapat ditindaklanjuti'], 4],
            ['Sebelum mengirim laporan, Anda sebaiknya...', ['Menghapus sumber data', 'Memeriksa akurasi dan kelengkapan', 'Mengabaikan format', 'Mengganti angka perkiraan', 'Mengirim tanpa membaca'], 1],
            ['Pesan yang mendesak dan kompleks sebaiknya disampaikan melalui...', ['Pesan singkat tanpa tindak lanjut', 'Panggilan atau rapat singkat, lalu dikonfirmasi secara tertulis', 'Papan pengumuman', 'Email tanpa subjek', 'Laporan bulanan'], 1],
            ['Setelah rapat koordinasi, langkah yang tepat adalah...', ['Mengabaikan hasil rapat', 'Menghapus catatan', 'Membuat ringkasan keputusan dan penanggung jawab tindak lanjut', 'Menunggu tanpa kabar', 'Mengubah keputusan sendiri'], 2],
        ],
        'powerbi' => [
            ['Power BI digunakan terutama untuk...', ['Visualisasi dan analisis data', 'Mengemudikan forklift', 'Mengemas barang', 'Mengganti email', 'Mengukur suhu'], 0],
            ['Power Query digunakan untuk...', ['Mengirim undangan', 'Membersihkan dan mentransformasi data', 'Mencetak label saja', 'Membuat akun HR', 'Menghapus dashboard'], 1],
            ['Relasi antar tabel biasanya dibuat melalui...', ['Warna tabel', 'Urutan kolom', 'Kolom kunci yang sesuai', 'Nama laporan saja', 'Ukuran font'], 2],
            ['DAX digunakan untuk...', ['Mengirim chat', 'Mengatur jaringan', 'Mengganti password', 'Membuat perhitungan analitis', 'Menghapus sumber data'], 3],
            ['Slicer pada laporan membantu pengguna...', ['Mengubah perangkat', 'Mengganti logo', 'Menghapus tabel', 'Mencetak otomatis', 'Memfilter data secara interaktif'], 4],
            ['Sebelum membagikan dashboard, sebaiknya...', ['Memeriksa akurasi data dan izin akses', 'Membuka semua akses', 'Menghapus sumber', 'Mengabaikan nilai kosong', 'Mengubah angka'], 0],
            ['Grafik garis cocok untuk menunjukkan...', ['Daftar email', 'Tren dari waktu ke waktu', 'Dokumen teks panjang', 'Struktur folder', 'Password'], 1],
            ['Refresh data bertujuan untuk...', ['Menghapus visual', 'Mengganti judul', 'Memperbarui laporan dari sumber data', 'Mengubah hak akses', 'Menambah halaman kosong'], 2],
        ],
    ];

    public static function publicBanks(): array
    {
        return array_map(
            static fn (array $bank): array => array_map(
                static fn (array $question): array => ['prompt' => $question[0], 'options' => $question[1]],
                $bank,
            ),
            self::BANKS,
        );
    }

    public static function forTraining(string $name): string
    {
        $name = mb_strtolower($name);

        return match (true) {
            str_contains($name, 'persediaan') => 'inventory',
            str_contains($name, 'komunikasi') => 'communication',
            str_contains($name, 'power bi') => 'powerbi',
            default => 'general',
        };
    }

    public static function grade(string $bank, array $answers): array
    {
        $questions = $bank === 'general' ? array_slice(self::BANKS['assessment'], 0, 8) : self::BANKS[$bank];

        if (! array_is_list($answers) || count($answers) !== count($questions)) {
            throw ValidationException::withMessages(['answers' => 'Jumlah jawaban tidak sesuai dengan jumlah soal.']);
        }

        $correct = 0;
        foreach ($questions as $index => $question) {
            $answer = $answers[$index];
            if ($answer !== null && (! is_int($answer) || ! array_key_exists($answer, $question[1]))) {
                throw ValidationException::withMessages(['answers' => 'Pilihan jawaban tidak valid.']);
            }
            $correct += (int) ($answer === $question[2]);
        }

        $total = count($questions);
        $empty = count(array_keys($answers, null, true));

        return ['score' => (int) round($correct / $total * 100), 'correct' => $correct, 'wrong' => $total - $correct - $empty, 'empty' => $empty];
    }
}
