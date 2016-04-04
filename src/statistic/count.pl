#!/usr/bin/perl

# Compute articles' words' statistics.

use strict;
use warnings;

use feature "say";
use Data::Dumper qw (Dumper);

main($ARGV[0], $ARGV[1], $ARGV[2]);

###

sub main {
    my $document = shift;
    my $index    = shift;
    my $docLimit = shift;

    ## preprocess & index
    my %list = indexing($document, $index, $docLimit);

    # print Dumper \%list;
    say "selesai.";
}

sub indexing {
    my $documentFile = shift;
    my $indexFile    = shift;
    my $docLimit     = shift;

    ## open dokumen awal
    open(DOCUMENT, "$documentFile") or die "can't open document file";

    ## open file indeks kata
    open(INDEX, "> $indexFile") or die "can't open index file";

    # frekuensi total
    my %termfreq = ();

    # total seluruh dokumen
    my $totalDoc = 0;

    # frekuensi tiap docid - docno
    my %result = ();

    # frekuensi per dokumen
    my %hashKata = ();

    # nomor dokumen
    my $curr_doc_id;

    while(<DOCUMENT>) {
        chomp;
        s/\s+/ /gi;

        if ($totalDoc == $docLimit) {
            last;
        }

        ## update informasi docid
        if (/<DOCID>/) {
            s/<.*?>/ /gi;
            s/\s+/ /gi;
            s/^\s+//;
            s/\s+$//;

            ## inisialisasi ulang hashkata dan nomor dokumen tiap dokumen baru
            %hashKata = ();
            $curr_doc_id = $_;
            $totalDoc += 1;

            say "processing docid: " . $curr_doc_id;
        }

        if (/<\/DOC>/) {
            ## simpan frekuensi tiap kata dalam tiap docid
            $result{ $curr_doc_id } = { %hashKata };

            ## kosongkan daftar frekuensi kata untuk dokumen selanjutnya
            %hashKata = ();
        }

        if (/<TEXT>/../<\/TEXT>/) {
            s/<.*?>/ /gi;
            s/[#\%\$\&\/\\,;:!?\.\@+`'"\*()_{}^=|]/ /g;
            s/\s+/ /gi;
            s/^\s+//;
            s/\s+$//;
            tr/[A-Z]/[a-z]/;

            ## tokenisasi
            my @splitKorpus = split;

            foreach my $kata(@splitKorpus) {
                unless ($kata =~ /[0-9]/)  {
                    if (exists($hashKata{ $kata })) {
                        $hashKata{ $kata } += 1;
                    } else {
                        $hashKata{ $kata } = 1;
                    }

                    if (exists($termfreq{$kata})) {
                        $termfreq{ $kata } += 1;
                    } else {
                        $termfreq{ $kata } = 1;
                    }
                }
            }
        }
    }

    say "outputing to file..";

    # output frekuensi kata
    foreach my $word (sort {$termfreq{ $b } <=> $termfreq{ $a }
        or $b cmp $a} keys %termfreq) {
        printf INDEX "%20s : %8d\n", $word, $termfreq{ $word };
    }

    say "";

    say ":: Statistics ::";
    say "total document count : " . $totalDoc;
    say "total word count     : " . keys %termfreq;
    say "";

    ## tutup file
    close DOCUMENT;
    close INDEX;

    return %result;
}
