import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Answer {
  id: string;
  text: string;
}

const CreatePoll: React.FC = () => {
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([
    { id: crypto.randomUUID(), text: '' },
    { id: crypto.randomUUID(), text: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle question input change
  const handleQuestionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuestion(e.target.value);
  };

  // Handle answer input change
  const handleAnswerChange = (id: string, value: string) => {
    setAnswers(
      answers.map((answer) =>
        answer.id === id ? { ...answer, text: value } : answer
      )
    );
  };

  // Add a new answer option
  const handleAddAnswer = () => {
    if (answers.length < 10) {
      setAnswers([...answers, { id: crypto.randomUUID(), text: '' }]);
    }
  };

  // Remove an answer option
  const handleRemoveAnswer = (id: string) => {
    if (answers.length > 2) {
      setAnswers(answers.filter((answer) => answer.id !== id));
    }
  };

  // Validate the form
  const validateForm = (): boolean => {
    setError(null);

    if (!question.trim()) {
      setError('Please enter a question');
      return false;
    }

    if (answers.length < 2) {
      setError('Poll must have at least 2 answer options');
      return false;
    }

    if (answers.length > 10) {
      setError('Poll cannot have more than 10 answer options');
      return false;
    }

    const emptyAnswerIndex = answers.findIndex((answer) => !answer.text.trim());
    if (emptyAnswerIndex !== -1) {
      setError(`Answer option ${emptyAnswerIndex + 1} is empty`);
      return false;
    }

    return true;
  };

  // Submit the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/poll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          answers: answers.map((answer) => answer.text),
        }),
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to create poll: ${response.status}`);
      }

      const data = await response.json();
      setSuccessMessage('Poll created successfully!');
      
      // Navigate to the new poll after a brief delay
      setTimeout(() => {
        navigate(`/poll/${data.poll.id}`);
      }, 1500);
    } catch (err) {
      console.error('Error creating poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to create poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-poll-container">
      <h1 className="create-poll-title">Create a New Poll</h1>
      
      {error && (
        <div className="create-poll-error">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="create-poll-success">
          {successMessage}
        </div>
      )}
      
      <form className="create-poll-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="question">Question</label>
          <input
            type="text"
            id="question"
            value={question}
            onChange={handleQuestionChange}
            placeholder="Ask a question..."
            disabled={isSubmitting}
            className="question-input"
          />
        </div>
        
        <div className="form-group">
          <label>Answer Options</label>
          <p className="answer-count">
            {answers.length}/10 options
          </p>
          
          <div className="answer-options">
            {answers.map((answer, index) => (
              <div key={answer.id} className="answer-option">
                <input
                  type="text"
                  value={answer.text}
                  onChange={(e) => handleAnswerChange(answer.id, e.target.value)}
                  placeholder={`Answer option ${index + 1}`}
                  disabled={isSubmitting}
                  className="answer-input"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveAnswer(answer.id)}
                  disabled={isSubmitting || answers.length <= 2}
                  className="remove-answer-button"
                  aria-label="Remove answer option"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          
          <button
            type="button"
            onClick={handleAddAnswer}
            disabled={isSubmitting || answers.length >= 10}
            className="add-answer-button"
          >
            + Add Answer Option
          </button>
        </div>
        
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/')}
            disabled={isSubmitting}
            className="cancel-button"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="submit-button"
          >
            {isSubmitting ? 'Creating Poll...' : 'Create Poll'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePoll;
