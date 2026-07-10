"use client";

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export interface RadarChartProps {
  labels?: string[];
  datasets?: any[];
  showLegend?: boolean;
}

export default function RadarChart({ labels, datasets, showLegend = false }: RadarChartProps) {
  const primaryColor = '#4648d4'; // Indigo/Primary
  const gridColor = 'rgba(255, 255, 255, 0.1)';

  const defaultLabels = ['Progress', 'Quiz Scores', 'Engagement', 'Assignments', 'Attendance', 'Participation'];
  const defaultDatasets = [
    {
      label: 'Current Metrics',
      data: [84, 92, 78, 88, 95, 70],
      backgroundColor: 'rgba(70, 72, 212, 0.2)', // Primary with opacity
      borderColor: primaryColor,
      pointBackgroundColor: primaryColor,
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: primaryColor,
      borderWidth: 2,
    },
  ];

  const data = {
    labels: labels || defaultLabels,
    datasets: datasets || defaultDatasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { color: gridColor },
        grid: { color: gridColor, circular: true },
        pointLabels: {
          font: {
            family: "'Geist', sans-serif",
            size: 11,
            weight: 600 as const,
          },
          color: 'rgba(255, 255, 255, 0.7)',
        },
        ticks: {
          display: false, // hide numbers on rings
          min: 0,
          max: 100,
          stepSize: 20
        },
      },
    },
    plugins: {
      legend: { 
        display: showLegend,
        position: 'bottom' as const,
        labels: {
          font: { family: "'Geist', sans-serif", size: 12 },
          usePointStyle: true,
          boxWidth: 6
        }
      },
      tooltip: {
        backgroundColor: '#131b2e',
        titleFont: { family: "'Geist', sans-serif", size: 14 },
        bodyFont: { family: "'Geist', sans-serif", size: 14 },
        padding: 12,
        cornerRadius: 8,
        displayColors: showLegend,
      },
    },
  };

  return <Radar data={data} options={options} />;
}
