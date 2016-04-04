<?php

// include composer autoloader
require_once __DIR__ . '/../vendor/autoload.php';

function getTextFromSentence($text)
{
    // create sentence detector
    $sentenceDetectorFactory = new \Sastrawi\SentenceDetector\SentenceDetectorFactory();
    $sentenceDetector = $sentenceDetectorFactory->createSentenceDetector();

    // detect sentence & print
    foreach ($sentences = $sentenceDetector->detect($text) as $sentence) {
        echo "$sentence\n";
    }
}

getTextFromSentence($argv[1]);
// echo $argv[1];
