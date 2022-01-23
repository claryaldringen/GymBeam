import { request } from 'https'
import { parse } from 'csv-parse'
import { SentimentAnalyzer, PorterStemmer } from 'natural'

const CSV_URL =
  'https://gist.githubusercontent.com/derror/24b62116c54d4c18d99b5c3527590d54/raw/510fd70161608e1bcb7b44276b89ebf06ed9cd71/dataset-gymbeam-product-descriptions-eng.csv'

const FORBIDDEN_WORDS = [
  'a',
  'an',
  'the',
  'and',
  'but',
  'or',
  'nor',
  'for',
  'yet',
  'so',
  'of',
  'it',
  'is',
  'to',
  'in',
  'with',
  'which',
  'as',
  'are',
  'that',
  'will',
  'also',
  'its',
]

type WordMap = { [word: string]: number }
type WordFrequencyResult = { frequency: number; words: string[] }
type SentimentResult = { name: string; description: string; sentiment: number }

const wordMap: WordMap = {}

const parseWords = (input: string): string[] =>
  input
    .trim()
    .replace(/[.,!:;]/g, '')
    .split(/\s+/)

const addWordsToFrequencyMap = (words: string[]): void =>
  words
    .reduce((reduced: string[], word) => {
      const lowercasedWord = word.toLowerCase()
      if (!FORBIDDEN_WORDS.includes(lowercasedWord)) {
        reduced.push(lowercasedWord)
      }
      return reduced
    }, [])
    .forEach((word) => {
      if (!wordMap[word]) {
        wordMap[word] = 1
      } else {
        wordMap[word]++
      }
    })

const getWordFrequenciesFromMap = (resultsCount: number): WordFrequencyResult[] =>
  Object.keys(wordMap)
    .reduce((frequencies: string[][], word) => {
      const frequency = wordMap[word]
      if (!frequencies[frequency]) {
        frequencies[frequency] = [word]
      } else {
        frequencies[frequency].push(word)
      }
      return frequencies
    }, [])
    .reduce((results: WordFrequencyResult[], words, frequency) => {
      results.push({ frequency, words })
      return results
    }, [])
    .sort((prev, next) => next.frequency - prev.frequency)
    .slice(0, resultsCount)

const output = (
  mostNegative: SentimentResult,
  mostPositive: SentimentResult,
  frequencyResults: WordFrequencyResult[],
): void => {
  console.log(`THE MOST POSITIVE (sentiment ${mostPositive.sentiment}):`)
  console.log(mostPositive.name)
  console.log(mostPositive.description)
  console.log('\n')

  console.log(`THE MOST NEGATIVE (sentiment ${mostNegative.sentiment}):`)
  console.log(mostNegative.name)
  console.log(mostNegative.description)
  console.log('\n')
  console.log('WORDS FREQUENCY:')
  frequencyResults.forEach((result, index) => {
    console.log(`${index + 1}. ${result.words.join(', ')} (${result.frequency} occurences)`)
  })
  console.log('\n')
}

const getSentiment = (words: string[]): number => {
  const analyzer = new SentimentAnalyzer('English', PorterStemmer, 'afinn')
  return analyzer.getSentiment(words)
}

request(CSV_URL, (res) => {
  let data = ''
  res.on('data', (chunk) => {
    data += chunk
  })
  res.on('end', () => {
    parse(data, {}, (err, records) => {
      let negative: SentimentResult, positive: SentimentResult
      records.forEach(([name, description]) => {
        const cleanDescription = description.replace(/(<([^>]+)>)/gi, '')
        const words = parseWords(cleanDescription)
        addWordsToFrequencyMap(words)
        const sentiment = getSentiment(words)
        if (!negative || negative.sentiment > sentiment) {
          negative = { name, description: cleanDescription, sentiment }
        }
        if (!positive || positive.sentiment < sentiment) {
          positive = { name, description: cleanDescription, sentiment }
        }
      })
      output(negative, positive, getWordFrequenciesFromMap(10))
    })
  })
})
  .on('error', (err) => {
    console.log(err)
  })
  .end()
