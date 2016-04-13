<?php

// Include composer autoloader.
require_once __DIR__ . '/../../vendor/autoload.php';

/**
 * Split text into sentences.
 *
 * @param  string $text Text to be split
 * @return string       JSON encoded split sentences
 */
function getTextFromSentence($text)
{
    // Create sentence detector object.
    $sentenceDetectorFactory = new \Sastrawi\SentenceDetector\SentenceDetectorFactory();
    $sentenceDetector = $sentenceDetectorFactory->createSentenceDetector();

    // Detect sentences.
    $sentences = $sentenceDetector->detect($text);
    return json_encode($sentences);
}

// Output result.
echo getTextFromSentence($argv[1]);
