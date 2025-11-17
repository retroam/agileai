import { useState, useMemo, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip } from 'recharts';

interface LDAVisData {
  topics: Array<{
    id: number;
    x: number;
    y: number;
    size: number;
    words?: Array<{
      text: string;
      value: number;
      probability?: number;
      loglift?: number;
      termIndex?: number;
    }>;
    label?: string;
    enhanced_label?: string;
    description?: string;
    formatted_description?: string;
    weight?: number;
    health_indicator?: string;
    action_items?: string[];
  }>;
  terms: string[];
  term_frequency: number[];
  topic_term_dists: number[][];
  enhanced?: boolean;
  health_summary?: Record<string, number>;
}

interface ScatterPlotProps {
  topics: LDAVisData['topics'];
  onTopicSelect: (id: number) => void;
  selectedTopic: number | null;
}

function ScatterPlot({ topics, onTopicSelect, selectedTopic }: ScatterPlotProps) {
  const filteredTopics = topics.filter((topic) =>
    typeof topic.x === 'number' && typeof topic.y === 'number'
  );

  const absX = filteredTopics.map((topic) => Math.abs(topic.x ?? 0));
  const maxAbsX = absX.length ? Math.max(...absX) : 1;
  const scaleFactor = maxAbsX > 5 ? 1 : 100;

  const weights = filteredTopics.map((topic) => Math.max(topic.weight ?? topic.size ?? 0, 0));
  const maxWeight = weights.length ? Math.max(...weights) : 1;

  const scatterData = filteredTopics.map((topic) => {
    const weight = Math.max(topic.weight ?? topic.size ?? 0, 0);
    const normalizedWeight = maxWeight > 0 ? weight / maxWeight : 0;
    const radius = Math.max(12, Math.sqrt(normalizedWeight) * 60);
    const previewWords = topic.words?.slice(0, 4).map((w) => w.text).join(', ');

    return {
      id: topic.id,
      x: (topic.x ?? 0) * scaleFactor,
      y: (topic.y ?? 0) * scaleFactor,
      radius,
      weight,
      previewWords,
    };
  });

  const xValues = scatterData.map((d) => d.x);
  const yValues = scatterData.map((d) => d.y);

  const padding = 0.2;
  const xDomain = xValues.length
    ? [
        Math.min(...xValues) - (Math.max(...xValues) - Math.min(...xValues)) * padding,
        Math.max(...xValues) + (Math.max(...xValues) - Math.min(...xValues)) * padding,
      ]
    : [-1, 1];
  const yDomain = yValues.length
    ? [
        Math.min(...yValues) - (Math.max(...yValues) - Math.min(...yValues)) * padding,
        Math.max(...yValues) + (Math.max(...yValues) - Math.min(...yValues)) * padding,
      ]
    : [-1, 1];

  const renderNode = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) {
      return <g />;
    }

    const topic = topics.find(t => t.id === payload.id);
    const isSelected = payload.id === selectedTopic;

    // Color based on health indicator
    let fillColor = '#8884d8'; // default
    let strokeColor = '#6366f1';

    if (topic?.health_indicator === 'healthy') {
      fillColor = isSelected ? '#16a34a' : '#22c55e';
      strokeColor = isSelected ? '#15803d' : '#16a34a';
    } else if (topic?.health_indicator === 'attention') {
      fillColor = isSelected ? '#ca8a04' : '#eab308';
      strokeColor = isSelected ? '#a16207' : '#ca8a04';
    } else if (topic?.health_indicator === 'critical') {
      fillColor = isSelected ? '#dc2626' : '#ef4444';
      strokeColor = isSelected ? '#b91c1c' : '#dc2626';
    } else if (isSelected) {
      fillColor = '#2563eb';
      strokeColor = '#1d4ed8';
    }

    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={payload.radius}
          fill={fillColor}
          fillOpacity={0.7}
          stroke={strokeColor}
          strokeWidth={isSelected ? 3 : 1}
        />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={isSelected ? 12 : 10} fill="#1f2937" fontWeight={isSelected ? "bold" : "normal"}>
          {`${payload.id + 1}`}
        </text>
        {topic?.enhanced_label && (
          <text x={cx} y={cy + 18} textAnchor="middle" fontSize={9} fill="#6b7280">
            {topic.enhanced_label.length > 15 ? topic.enhanced_label.substring(0, 15) + '...' : topic.enhanced_label}
          </text>
        )}
      </g>
    );
  };

  return (
    <ScatterChart width={700} height={500} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
      <XAxis type="number" dataKey="x" domain={xDomain} hide />
      <YAxis type="number" dataKey="y" domain={yDomain} hide />
      <Tooltip
        cursor={{ strokeDasharray: '3 3' }}
        content={({ payload }) => {
          const entry = payload?.[0]?.payload;
          if (!entry) return null;

          const topic = filteredTopics.find((t) => t.id === entry.id);
          const healthEmoji = {
            'healthy': '✅',
            'attention': '⚠️',
            'critical': '🔴'
          }[topic?.health_indicator || ''] || '';

          return (
            <div className="bg-white p-3 border rounded shadow max-w-sm">
              <p className="font-medium flex items-center gap-2">
                Topic {entry.id + 1}: {topic?.enhanced_label || topic?.label || 'Loading...'} {healthEmoji}
              </p>
              {topic?.description && (
                <p className="text-xs text-muted-foreground mt-1 mb-2">
                  {topic.description}
                </p>
              )}
              {topic?.words?.length ? (
                <p className="text-sm text-muted-foreground">
                  Top words: {topic.words
                    .slice(0, 5)
                    .map((w) => w.text)
                    .join(', ')}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Topic weight: {entry.weight.toFixed(3)}</p>
              )}
              {topic?.health_indicator && (
                <p className="text-xs text-muted-foreground mt-1">
                  Health: {topic.health_indicator}
                </p>
              )}
            </div>
          );
        }}
      />
      <Scatter
        data={scatterData}
        shape={renderNode}
        onClick={(data) => {
          const id = data?.payload?.id;
          if (typeof id === 'number') {
            onTopicSelect(id);
          }
        }}
        cursor="pointer"
      />
    </ScatterChart>
  );
}

interface TopicDetailsProps {
  selectedTopic: number | null;
  lambda: number;
  setLambda: (value: number) => void;
  data: LDAVisData;
}

function TopicDetails({ selectedTopic, lambda, setLambda, data }: TopicDetailsProps) {
  if (selectedTopic === null) {
    return (
      <div className="bg-white p-6 rounded-lg border">
        <p>Select a topic to see details</p>
      </div>
    );
  }

  const topWords = useMemo(
    () => computeTopWords(selectedTopic, lambda, data),
    [selectedTopic, lambda, data]
  );

  const topic = data.topics.find((t) => t.id === selectedTopic);

  const relevanceRows = useMemo(() => {
    return topWords.map(({ word, score, termIndex }) => {
      const safeIndex = termIndex ?? data.terms.indexOf(word);
      const corpusFreq = safeIndex >= 0 ? data.term_frequency?.[safeIndex] ?? 0 : 0;
      const topicProb = safeIndex >= 0 ? data.topic_term_dists?.[selectedTopic]?.[safeIndex] ?? 0 : 0;

      return {
        word,
        relevance: score,
        corpusFrequency: corpusFreq,
        topicProbability: topicProb,
      };
    });
  }, [data.term_frequency, data.terms, data.topic_term_dists, selectedTopic, topWords]);

  const summaryLine = useMemo(() => {
    if (topic?.words?.length) {
      return topic.words.slice(0, 5).map((w) => w.text).join(', ');
    }
    return relevanceRows.slice(0, 5).map((row) => row.word).join(', ');
  }, [relevanceRows, topic]);

  const healthEmoji = {
    'healthy': '✅',
    'attention': '⚠️',
    'critical': '🔴'
  }[topic?.health_indicator || ''] || '';

  const healthColor = {
    'healthy': 'text-green-600',
    'attention': 'text-yellow-600',
    'critical': 'text-red-600'
  }[topic?.health_indicator || ''] || '';

  return (
    <div className="bg-white p-6 rounded-lg border">
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
          Topic {selectedTopic + 1}: {topic?.enhanced_label || topic?.label || 'Loading...'} {healthEmoji}
        </h3>
        {topic?.description && (
          <p className="text-sm text-muted-foreground mb-2">{topic.description}</p>
        )}
        {topic?.health_indicator && (
          <p className={`text-sm font-medium mb-2 ${healthColor}`}>
            Health Status: {topic.health_indicator}
          </p>
        )}
        {topic?.action_items && topic.action_items.length > 0 && (
          <div className="mb-3">
            <p className="text-sm font-medium mb-1">Recommended Actions:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {topic.action_items.map((action, idx) => (
                <li key={idx} className="flex items-start gap-1">
                  <span>•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {summaryLine && (
          <p className="text-sm text-muted-foreground mb-4">
            Keywords: {summaryLine}
          </p>
        )}
        <div className="mb-4">
          <label className="block mb-2">
            Relevance (λ): {lambda.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={lambda}
            onChange={(e) => setLambda(parseFloat(e.target.value))}
            className="w-full"
            aria-label="Adjust topic relevance"
          />
        </div>
        <h4 className="font-semibold mb-2">Top Terms</h4>
        <div className="space-y-1">
          <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground mb-1">
            <div>Term</div>
            <div className="text-right">λ relevance</div>
            <div className="text-right">P(term|topic)</div>
            <div className="text-right">Corpus freq</div>
          </div>
          {relevanceRows.slice(0, 10).map((row) => (
            <div key={row.word} className="grid grid-cols-4 gap-2 text-sm">
              <div>{row.word}</div>
              <div className="text-right">{row.relevance.toFixed(3)}</div>
              <div className="text-right">{(row.topicProbability * 100).toFixed(2)}%</div>
              <div className="text-right">{Math.round(row.corpusFrequency).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function computeTopWords(topicId: number, lambda: number, data: LDAVisData) {
  // Handle indexing safely - ensure we're accessing valid arrays
  if (!data.topic_term_dists || !data.topic_term_dists[topicId] || !data.term_frequency) {
    return [];
  }
  
  const pWordGivenTopic = data.topic_term_dists[topicId];
  const pWord = data.term_frequency;

  // Apply smoothing to avoid log(0) cases
  const MIN_PROBABILITY = 1e-8;
  
  const relevance = pWordGivenTopic.map((p_w_t, i) => {
    const topicProb = typeof p_w_t === 'number' ? p_w_t : MIN_PROBABILITY;
    const corpusProb = typeof pWord[i] === 'number' ? pWord[i] : MIN_PROBABILITY;
    const p_w_t_smooth = Math.max(topicProb, MIN_PROBABILITY);
    const p_w = Math.max(corpusProb, MIN_PROBABILITY);

    return lambda * Math.log(p_w_t_smooth) + (1 - lambda) * Math.log(p_w_t_smooth / p_w);
  });

  const topIndices = relevance
    .map((score, index) => ({ score, index }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10) // Top 10 words
    .map(item => item.index);

  return topIndices.map(index => ({
    word: data.terms[index],
    score: relevance[index],
    termIndex: index,
  }));
}

interface LDAVisViewerProps {
  data: LDAVisData;
}

export function LDAVisViewer({ data }: LDAVisViewerProps) {
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [lambda, setLambda] = useState(0.6); // Default λ value
  
  // Pre-process data to ensure it's in the format we expect
  const processedDataMemo = useMemo(() => {
    const clonedData = structuredClone(data);
    // Process topics to ensure they have all required fields
    if (clonedData.topics) {
      clonedData.topics = clonedData.topics.map(topic => {
        // If words array is missing, try to generate it from the topic_term_dists
        if (!topic.words || topic.words.length === 0) {
          const topWords = computeTopWordsForTopic(topic.id, 0.5, clonedData);
          topic.words = topWords.map(({ word, score, termIndex }) => {
            const safeIndex = termIndex ?? clonedData.terms.indexOf(word);
            const topicProbability = safeIndex >= 0 ? clonedData.topic_term_dists?.[topic.id]?.[safeIndex] ?? 0 : 0;
            const corpusFrequency = safeIndex >= 0 ? clonedData.term_frequency?.[safeIndex] ?? 0 : Math.exp(score);

            return {
              text: word,
              value: corpusFrequency,
              probability: topicProbability,
              loglift: score,
              termIndex: safeIndex,
            };
          });
        }
        
        // If label is missing, generate it from words
        if (!topic.label && topic.words) {
          topic.label = topic.words.slice(0, 5).map(w => w.text).join(", ");
        }
        
        return topic;
      });
    }
    
    // Ensure term_frequency array has valid values (no zeros to avoid log(0))
    if (clonedData.term_frequency) {
      clonedData.term_frequency = clonedData.term_frequency.map(val => 
        Math.max(val, 1e-8)
      );
    }
    
    return clonedData;
  }, [data]);

  useEffect(() => {
    const availableTopics = processedDataMemo.topics ?? [];
    if (!availableTopics.length) {
      setSelectedTopic(null);
      return;
    }

    const hasSelection = availableTopics.some((topic) => topic.id === selectedTopic);
    if (selectedTopic === null || !hasSelection) {
      setSelectedTopic(availableTopics[0].id);
    }
  }, [processedDataMemo.topics, selectedTopic]);
  
  // Helper function to compute top words for a topic
  function computeTopWordsForTopic(topicId: number, lambda: number, data: LDAVisData) {
    if (!data.topic_term_dists || !data.topic_term_dists[topicId] || !data.term_frequency || !data.terms) {
      return [];
    }
    
    const pWordGivenTopic = data.topic_term_dists[topicId];
    const pWord = data.term_frequency;
    const MIN_PROBABILITY = 1e-8;
    
    const relevance = pWordGivenTopic.map((p_w_t, i) => {
      const topicProb = typeof p_w_t === 'number' ? p_w_t : MIN_PROBABILITY;
      const corpusProb = typeof pWord[i] === 'number' ? pWord[i] : MIN_PROBABILITY;
      const p_w_t_smooth = Math.max(topicProb, MIN_PROBABILITY);
      const p_w = Math.max(corpusProb, MIN_PROBABILITY);
      return lambda * Math.log(p_w_t_smooth) + (1 - lambda) * Math.log(p_w_t_smooth / p_w);
    });

    const topIndices = relevance
      .map((score, index) => ({ score, index }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.index);

    return topIndices.map(index => ({
      word: data.terms[index],
      score: relevance[index],
      termIndex: index,
    }));
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
      <div className="lg:col-span-2 border rounded-lg p-4 bg-white">
        <div className="mb-4">
          <h3 className="text-lg font-medium">Intertopic Distance Map</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Topics are represented as circles. Size indicates overall topic prevalence.
            Distance between circles indicates topic similarity.
          </p>
        </div>
        <div className="flex justify-center">
          <ScatterPlot
            topics={processedDataMemo.topics}
            onTopicSelect={setSelectedTopic}
            selectedTopic={selectedTopic}
          />
        </div>
      </div>
      <div className="border rounded-lg p-4 bg-white">
        <div className="mb-4">
          <h3 className="text-lg font-medium">Topic Term Distribution</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Slide λ to adjust term rankings. Higher values give more weight to topic-specific terms.
          </p>
        </div>
        <TopicDetails
          selectedTopic={selectedTopic}
          lambda={lambda}
          setLambda={setLambda}
          data={processedDataMemo}
        />
      </div>
    </div>
  );
}

export default LDAVisViewer; 
