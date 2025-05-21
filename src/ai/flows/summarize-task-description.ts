'use server';

/**
 * @fileOverview A flow to summarize complex task descriptions using AI.
 *
 * - summarizeTaskDescription - A function that summarizes a task description.
 * - SummarizeTaskDescriptionInput - The input type for the summarizeTaskDescription function.
 * - SummarizeTaskDescriptionOutput - The return type for the summarizeTaskDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTaskDescriptionInputSchema = z.object({
  taskDescription: z.string().describe('The task description to summarize.'),
});
export type SummarizeTaskDescriptionInput = z.infer<typeof SummarizeTaskDescriptionInputSchema>;

const SummarizeTaskDescriptionOutputSchema = z.object({
  summary: z.string().describe('The summarized task description.'),
});
export type SummarizeTaskDescriptionOutput = z.infer<typeof SummarizeTaskDescriptionOutputSchema>;

export async function summarizeTaskDescription(input: SummarizeTaskDescriptionInput): Promise<SummarizeTaskDescriptionOutput> {
  return summarizeTaskDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeTaskDescriptionPrompt',
  input: {schema: SummarizeTaskDescriptionInputSchema},
  output: {schema: SummarizeTaskDescriptionOutputSchema},
  prompt: `Summarize the following task description in a concise and easy-to-understand manner:\n\n{{{taskDescription}}}`,
});

const summarizeTaskDescriptionFlow = ai.defineFlow(
  {
    name: 'summarizeTaskDescriptionFlow',
    inputSchema: SummarizeTaskDescriptionInputSchema,
    outputSchema: SummarizeTaskDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
