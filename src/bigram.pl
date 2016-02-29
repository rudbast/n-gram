#!/usr/bin/perl
package Bigram;

use strict;
use warnings;

main();

sub main {
    my %bigrams;
    my $inputFile = $ARGV[0];

    open(INPUT, $inputFile) or die "open file error.";
    while(<INPUT>) {
        chomp(my $line = $_);
        # start bigram word splicing
        %bigrams = construct(\%bigrams, $line);
    }
    close(INPUT);

    # print result
    foreach my $word (sort {$bigrams{ $b } <=> $bigrams{ $a } or $a cmp $b} keys %bigrams) {
        printf("%20s : %2d\n", $word, $bigrams{ $word });
    }
}

sub construct {
    my $ref_bigrams = shift;
    my $line        = shift;

    my %bigrams = %{ $ref_bigrams };
    my @words   = split(/\s+/, $line);

    my $curr = shift(@words);
    my $next;

    # start sliding window
    while(@words) {
        $next = shift(@words);
        # construct bigram
        my $word = "$curr $next";

        # check bigram word existence
        if (exists($bigrams{ $word })) {
            $bigrams{ $word }++;
        } else {
            $bigrams{ $word } = 1;
        }
        $curr = $next;
    }

    return %bigrams;
}
