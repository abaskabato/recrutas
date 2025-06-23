import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Plus, 
  X, 
  Brain,
  Clock,
  Target,
  CheckCircle
} from "lucide-react";

interface ExamQuestion {
  id: string;
  type: 'multiple-choice' | 'short-answer';
  question: string;
  options?: string[];
  correctAnswer?: number | string;
  points: number;
}

interface ExamData {
  questions: ExamQuestion[];
  timeLimit: number;
  passingScore: number;
}

interface ExamCreationStepProps {
  examData: ExamData;
  onExamChange: (exam: ExamData) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ExamCreationStep({ 
  examData, 
  onExamChange, 
  onNext, 
  onBack 
}: ExamCreationStepProps) {
  const [currentQuestion, setCurrentQuestion] = useState<Partial<ExamQuestion>>({
    type: 'multiple-choice',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    points: 10,
  });

  const addQuestion = () => {
    if (currentQuestion.question?.trim()) {
      const newQuestion: ExamQuestion = {
        id: Date.now().toString(),
        type: currentQuestion.type as ExamQuestion['type'],
        question: currentQuestion.question,
        options: currentQuestion.type === 'multiple-choice' ? currentQuestion.options : undefined,
        correctAnswer: currentQuestion.correctAnswer,
        points: currentQuestion.points || 10,
      };

      onExamChange({
        ...examData,
        questions: [...examData.questions, newQuestion]
      });

      // Reset current question
      setCurrentQuestion({
        type: 'multiple-choice',
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        points: 10,
      });
    }
  };

  const removeQuestion = (id: string) => {
    onExamChange({
      ...examData,
      questions: examData.questions.filter(q => q.id !== id)
    });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(currentQuestion.options || ['', '', '', ''])];
    newOptions[index] = value;
    setCurrentQuestion(prev => ({
      ...prev,
      options: newOptions
    }));
  };

  const canProceed = examData.questions.length >= 1;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Brain className="w-12 h-12 mx-auto mb-4 text-blue-600" />
        <h2 className="text-2xl font-bold mb-2">Create Assessment</h2>
        <p className="text-slate-600">
          Create screening questions to evaluate candidates before they can chat with you
        </p>
      </div>

      {/* Exam Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Exam Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Time Limit (minutes)</Label>
              <Input
                type="number"
                value={examData.timeLimit}
                onChange={(e) => onExamChange({
                  ...examData,
                  timeLimit: parseInt(e.target.value) || 30
                })}
                placeholder="30"
                min="5"
                max="120"
              />
            </div>
            <div>
              <Label>Passing Score (%)</Label>
              <Input
                type="number"
                value={examData.passingScore}
                onChange={(e) => onExamChange({
                  ...examData,
                  passingScore: parseInt(e.target.value) || 70
                })}
                placeholder="70"
                min="50"
                max="100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Questions */}
      {examData.questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Created Questions ({examData.questions.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {examData.questions.map((question, index) => (
              <div key={question.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="outline">{question.type}</Badge>
                      <Badge variant="secondary">{question.points} points</Badge>
                    </div>
                    <h4 className="font-medium mb-2">Q{index + 1}: {question.question}</h4>
                    {question.options && (
                      <div className="space-y-1">
                        {question.options.map((option, optIndex) => (
                          <div key={optIndex} className={`text-sm p-2 rounded ${
                            question.correctAnswer === optIndex 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-slate-50'
                          }`}>
                            {String.fromCharCode(65 + optIndex)}. {option}
                            {question.correctAnswer === optIndex && (
                              <CheckCircle className="w-4 h-4 inline ml-2" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(question.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add New Question */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Question Type</Label>
              <Select
                value={currentQuestion.type}
                onValueChange={(value: 'multiple-choice' | 'short-answer') => 
                  setCurrentQuestion(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                  <SelectItem value="short-answer">Short Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Points</Label>
              <Input
                type="number"
                value={currentQuestion.points}
                onChange={(e) => setCurrentQuestion(prev => ({
                  ...prev,
                  points: parseInt(e.target.value) || 10
                }))}
                min="1"
                max="50"
              />
            </div>
          </div>

          <div>
            <Label>Question</Label>
            <Textarea
              value={currentQuestion.question}
              onChange={(e) => setCurrentQuestion(prev => ({
                ...prev,
                question: e.target.value
              }))}
              placeholder="Enter your question here..."
              rows={3}
            />
          </div>

          {currentQuestion.type === 'multiple-choice' ? (
            <div className="space-y-4">
              <Label>Answer Options</Label>
              {currentQuestion.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="w-6 text-center font-medium">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  />
                </div>
              ))}
              
              <div>
                <Label>Correct Answer</Label>
                <RadioGroup
                  value={currentQuestion.correctAnswer?.toString()}
                  onValueChange={(value) => setCurrentQuestion(prev => ({
                    ...prev,
                    correctAnswer: parseInt(value)
                  }))}
                >
                  {currentQuestion.options?.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={index.toString()} id={`correct-${index}`} />
                      <Label htmlFor={`correct-${index}`}>
                        {String.fromCharCode(65 + index)}. {option || `Option ${String.fromCharCode(65 + index)}`}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          ) : (
            <div>
              <Label>Sample Correct Answer (for grading guidance)</Label>
              <Textarea
                value={currentQuestion.correctAnswer as string || ''}
                onChange={(e) => setCurrentQuestion(prev => ({
                  ...prev,
                  correctAnswer: e.target.value
                }))}
                placeholder="Provide a sample answer or keywords to look for..."
                rows={2}
              />
            </div>
          )}

          <Button 
            onClick={addQuestion}
            disabled={!currentQuestion.question?.trim()}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={onNext}
          disabled={!canProceed}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Target className="w-4 h-4 mr-2" />
          Review & Post Job
        </Button>
      </div>

      {!canProceed && (
        <p className="text-center text-sm text-slate-500">
          Add at least 1 question to continue
        </p>
      )}
    </div>
  );
}