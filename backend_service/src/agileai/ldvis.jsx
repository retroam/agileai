import React, { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip } from 'recharts';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Example data structure
const exampleData = {
  "topics": [
    {"id": 1, "x": 0.1, "y": 0.2, "size": 0.05},
    {"id": 2, "x": 0.3, "y": 0.4, "size": 0.03}
  ],
  "terms": ["apple", "banana", "orange"],
  "term_frequency": [0.02, 0.015, 0.01],
  "topic_term_dists": [
    [0.1, 0.05, 0.02],
    [0.03, 0.08, 0.04]
  ]
};

function ScatterPlot({ topics, onTopicSelect, selectedTopic }) {
  const scatterData = topics.map(topic => ({
    x: topic.x,
    y: topic.y,
    size: topic.size * 1000, // Scale for visibility
    id: topic.id,
  }));

  return (
    <ScatterChart width={400} height={400}>
      <XAxis type="number" dataKey="x" domain={[0, 1]} />
      <YAxis type="number" dataKey="y" domain={[0, 1]} />
      <Tooltip />
      <Scatter
        data={scatterData}
        fill="#8884d8"
        onClick={(data) => onTopicSelect(data.id)}
      >
        {scatterData.map(entry => (
          <circle
            key={entry.id}
            cx={0}
            cy={0}
            r={Math.sqrt(entry.size) * 20}
            fill={entry.id === selectedTopic ? '#ff7300' : '#8884d8'}
          />
        ))}
      </Scatter>
    </ScatterChart>
  );
}

function TopicDetails({ selectedTopic, lambda, setLambda, data }) {
  if (!selectedTopic) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p>Select a topic to see details</p>
        </CardContent>
      </Card>
    );
  }

  const topWords = computeTopWords(selectedTopic, lambda, data);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Topic {selectedTopic}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <label className="block mb-2">Relevance (λ): {lambda.toFixed(2)}</label>
          <Slider
            value={[lambda]}
            onValueChange={([value]) => setLambda(value)}
            min={0}
            max={1}
            step={0.01}
          />
        </div>
        <h3 className="font-semibold mb-2">Top Words</h3>
        <ul>
          {topWords.map(({ word, score }) => (
            <li key={word} className="mb-1">
              {word}: {score.toFixed(4)}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function computeTopWords(topicId, lambda, data) {
  const topicIndex = topicId - 1; // IDs start at 1
  const pWordGivenTopic = data.topic_term_dists[topicIndex];
  const pWord = data.term_frequency;

  const relevance = pWordGivenTopic.map((p_w_t, i) => {
    const p_w = pWord[i];
    return lambda * Math.log(p_w_t) + (1 - lambda) * Math.log(p_w_t / p_w);
  });

  const topIndices = relevance
    .map((score, index) => ({ score, index }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10) // Top 10 words
    .map(item => item.index);

  return topIndices.map(index => ({
    word: data.terms[index],
    score: relevance[index],
  }));
}

export function LDAVisViewer({ data = exampleData }) {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [lambda, setLambda] = useState(0.6); // Default λ value

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-medium mb-4">Topic Space</h3>
        <ScatterPlot
          topics={data.topics}
          onTopicSelect={setSelectedTopic}
          selectedTopic={selectedTopic}
        />
      </div>
      <div>
        <TopicDetails
          selectedTopic={selectedTopic}
          lambda={lambda}
          setLambda={setLambda}
          data={data}
        />
      </div>
    </div>
  );
}

export default LDAVisViewer;

