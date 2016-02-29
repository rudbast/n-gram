#!/usr/bin/perl

use strict;
use warnings;

use Ngram;

main();

sub main {
    my %ngrams;
    my $inputFile = $ARGV[0];

    open(INPUT, $inputFile) or die "open file error.";
    while(<INPUT>) {
        chomp(my $line = $_);
        # start ngram word splicing
        %ngrams = trigram(\%ngrams, $line);
    }
    close(INPUT);

    # print result
    foreach my $word (sort {$ngrams{ $b } <=> $ngrams{ $a } or $a cmp $b} keys %ngrams) {
        printf("%25s : %2d\n", $word, $ngrams{ $word });
    }
}
