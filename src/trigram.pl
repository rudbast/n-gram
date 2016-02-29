#!/usr/bin/perl

use strict;
use warnings;

main();

sub main {
    my %trigrams;
    my $inputFile = $ARGV[0];

    open(INPUT, $inputFile) or die "open file error.";
    while(<INPUT>) {
        chomp(my $line = $_);
        # start trigram word splicing
        %trigrams = construct(\%trigrams, $line);
    }
    close(INPUT);

    # print result
    foreach my $word (sort {$trigrams{ $b } <=> $trigrams{ $a } or $a cmp $b} keys %trigrams) {
        printf("%25s : %2d\n", $word, $trigrams{ $word });
    }
}

sub construct {
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
