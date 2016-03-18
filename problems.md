# What Is This ?

Problems that might arise for the upcoming proposal examination.

## Problems

### Mengapa menggunakan bigram pada non-word, tapi menggunakan trigram pada real-word ?

awalnya mengira bigram karena posisi koreksi kata bisa berubah2 (non-word), tapi sepertinya tidak berpengaruh, mungkin lebih baik menggunakan trigram.

### Skema sistem untuk bagian koreksi non-word kurang bagian kombinasi kata baru untuk kata yang mirip.

akan segera diperbaiki.

### Skema sistem tidak konsisten dengan contoh perhitungan n-gram.

akan segera diperbaiki.

### Contoh perhitungan n-gram, tapi mengapa ada bagian lain didalamnya (lev dist & spelling correction) ?

mungkin lebih baik diubah menjadi "contoh perhitungan n-gram dan edit distance.

### Lev dist vs dam-lev dist, mau pakai yang mana sih ?

mungkin dam-lev dist namum masih perlu disesuaikan dengan paper yang sudah ada (mau dibandingkan).

### Nama orang, nama tempat, dan yang serupa, bagaimana cara menanganinya ?

nama2 tersebut bisa apa aja, untuk menangani hal tersebut, ada beberapa alternatif :

1. Perbesar pengetahuan.

  - Menggunakan lebih banyak lagi artikel sebagai dasar pengetahuan.

2. Abaikan.

  - NER untuk mendeteksi entitas, kemudian menghindari koreksi pada entitas tersebut.

  - POS Tagger mengetahui hmmm
