#!/usr/bin/perl
package Ngram;

use strict;
use warnings;

use Exporter qw(import);
our @EXPORT    = qw(bigram trigram);
our @EXPORT_OK = qw(bigram trigram);

sub bigram {
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

sub trigram {
    my $ref_trigrams = shift;
    my $line        = shift;

    my %trigrams = %{ $ref_trigrams };
    my @words   = split(/\s+/, $line);

    my $curr = shift(@words);
    my $next = shift(@words);
    my $last;

    # start sliding window
    while(@words) {
        $last = shift(@words);
        # construct trigram
        my $word = "$curr $next $last";

        # check trigram word existence
        if (exists($trigrams{ $word })) {
            $trigrams{ $word }++;
        } else {
            $trigrams{ $word } = 1;
        }
        $curr = $next;
        $next = $last;
    }

    return %trigrams;
}
