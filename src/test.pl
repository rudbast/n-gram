#!/usr/bin/perl

use strict;
use warnings;

use Ngram;
use String::KeyboardDistanceXS qw(:all);
use Text::Levenshtein qw(fastdistance);

main();

sub main {
    my %ngrams;
    my $inputFile = $ARGV[0];
    my %list = ();

    open(INPUT, $inputFile) or die "open file error.";
    while(<INPUT>) {
        chomp(my $line = $_);
        # start ngram word splicing
        %ngrams = trigram(\%ngrams, $line);
        # foreach my $word (split /\s/, $line) {
        #     # if (fastdistance($word, "sate") <= 2) {
        #     #     $list{ $word } = 1;
        #     # }
        #     # print "$word " . fastdistance($word, "suka") . "\n";
        #     # $list{ $word } = fastdistance($word, "suka");
        # }
    }
    close(INPUT);

    # foreach my $word (sort keys %list) {
    #     print "$word\t$list{ $word }\n";
    # }

    # print result
    foreach my $word (sort {$ngrams{ $b } <=> $ngrams{ $a } or $a cmp $b} keys %ngrams) {
        printf("%25s : %2d\n", $word, $ngrams{ $word });
    }
    # print qwertyKeyboardDistance('bitu', 'bito') . "\n";

}
