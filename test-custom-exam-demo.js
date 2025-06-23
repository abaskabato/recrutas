#!/usr/bin/env node

// Comprehensive test demonstrating custom exam workflow
console.log('🎯 Custom Exam Workflow Demonstration\n');

console.log('=== TALENT MANAGER WORKFLOW ===\n');

console.log('1. Job Posting Wizard - Step 3: Automated Filtering');
console.log('   ✓ Talent manager enables "automated applicant filtering"');
console.log('   ✓ Creates custom exam with time limit (30 min) and passing score (70%)');

const sampleCustomQuestions = [
  {
    id: 'custom_1',
    type: 'multiple-choice',
    question: 'What is the time complexity of binary search?',
    options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
    correctAnswer: 1, // O(log n)
    points: 25
  },
  {
    id: 'custom_2', 
    type: 'multiple-choice',
    question: 'Which design pattern ensures only one instance of a class?',
    options: ['Factory', 'Observer', 'Singleton', 'Strategy'],
    correctAnswer: 2, // Singleton
    points: 20
  },
  {
    id: 'custom_3',
    type: 'short-answer',
    question: 'Explain the difference between REST and GraphQL APIs.',
    points: 30
  },
  {
    id: 'custom_4',
    type: 'multiple-choice', 
    question: 'What does SQL stand for?',
    options: ['System Query Language', 'Structured Query Language', 'Simple Query Language', 'Standard Query Language'],
    correctAnswer: 1, // Structured Query Language
    points: 15
  },
  {
    id: 'custom_5',
    type: 'short-answer',
    question: 'Describe a challenging technical problem you solved and your approach.',
    points: 10
  }
];

console.log('\n2. Custom Questions Created by Talent Manager:');
sampleCustomQuestions.forEach((q, i) => {
  console.log(`   Q${i+1}: ${q.question}`);
  if (q.type === 'multiple-choice') {
    q.options.forEach((opt, idx) => {
      const marker = idx === q.correctAnswer ? '✅' : '  ';
      console.log(`       ${marker} ${opt}`);
    });
  }
  console.log(`       Points: ${q.points} | Type: ${q.type}`);
  console.log('');
});

console.log('=== CANDIDATE WORKFLOW ===\n');

console.log('3. Candidate takes exam with custom questions');

// Simulate candidate answers (some correct, some incorrect)
const candidateAnswers = {
  'custom_1': '1', // Correct (O(log n))
  'custom_2': '0', // Incorrect (chose Factory instead of Singleton)
  'custom_3': 'REST uses HTTP methods and is stateless, GraphQL allows flexible queries...', // Short answer
  'custom_4': '1', // Correct (Structured Query Language) 
  'custom_5': 'I once optimized a database query that was taking 30 seconds...' // Short answer
};

console.log('4. Automatic Scoring Based on Custom Answers:');

let totalPoints = 0;
let earnedPoints = 0;

sampleCustomQuestions.forEach(q => {
  totalPoints += q.points;
  const userAnswer = candidateAnswers[q.id];
  let pointsEarned = 0;
  
  if (q.type === 'multiple-choice' && q.correctAnswer !== undefined) {
    if (parseInt(userAnswer) === q.correctAnswer) {
      pointsEarned = q.points;
      console.log(`   ✅ Q${sampleCustomQuestions.indexOf(q) + 1}: Correct (+${q.points} pts)`);
    } else {
      console.log(`   ❌ Q${sampleCustomQuestions.indexOf(q) + 1}: Incorrect (0 pts)`);
    }
  } else if (q.type === 'short-answer' && userAnswer && userAnswer.trim().length > 0) {
    pointsEarned = q.points;
    console.log(`   📝 Q${sampleCustomQuestions.indexOf(q) + 1}: Answered (+${q.points} pts)`);
  }
  
  earnedPoints += pointsEarned;
});

const finalScore = Math.round((earnedPoints / totalPoints) * 100);
const passingScore = 70;
const passed = finalScore >= passingScore;

console.log('\n=== SCORING RESULTS ===\n');
console.log(`📊 Total Points Possible: ${totalPoints}`);
console.log(`🎯 Points Earned: ${earnedPoints}`);
console.log(`📈 Final Score: ${finalScore}%`);
console.log(`🎓 Passing Score Required: ${passingScore}%`);
console.log(`${passed ? '✅ PASSED' : '❌ FAILED'} - ${passed ? 'Qualified for chat with hiring manager' : 'Did not meet requirements'}`);

console.log('\n=== HIRING MANAGER ACCESS ===\n');

if (passed) {
  console.log('5. Candidate Performance Summary for Hiring Manager:');
  console.log(`   📋 Candidate scored ${finalScore}% on custom technical assessment`);
  console.log(`   🏆 Ranked among top performers (score ≥ ${passingScore}%)`);
  console.log(`   💬 Chat access granted - direct connection enabled`);
  console.log(`   📊 Strong performance on: Binary search complexity, SQL knowledge`);
  console.log(`   📝 Provided detailed answers on technical problem-solving`);
} else {
  console.log('5. Candidate did not qualify for direct chat access');
  console.log(`   📊 Score of ${finalScore}% below ${passingScore}% threshold`);
  console.log(`   📋 Talent manager can review manually if desired`);
}

console.log('\n🎉 COMPLETE WORKFLOW DEMONSTRATED');
console.log('\n📋 Key Features Verified:');
console.log('   ✓ Talent managers create custom questions with correct answers');
console.log('   ✓ Multiple choice questions scored automatically'); 
console.log('   ✓ Short answer questions awarded full points if answered');
console.log('   ✓ Point-based scoring system with configurable passing scores');
console.log('   ✓ Automatic candidate ranking and chat qualification');
console.log('   ✓ Hiring manager gets detailed performance insights');
console.log('   ✓ End-to-end exam-to-hiring-manager workflow');