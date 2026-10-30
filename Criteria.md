# Score Criteria and Dashboard Judgement

This document explains how InterviewAgent generates interview scores and how the dashboard turns them into charts, Strong Areas, and Areas to Improve.

## 1. Per-answer score

For each submitted answer, the server asks the configured language model for an integer score from 0 to 100, plus a verdict, feedback, strengths, improvements, and a suggested answer.

The evaluation prompt tells the model to judge the answer fairly for the role, question category, and experience level:

- Fresher (0-2 years): fundamentals and clear basic reasoning; senior-level depth is not expected.
- Mid-level (2-5 years): practical application and independent choices.
- Senior (5+ years): depth, ownership, trade-offs, and edge cases.

The code validates that the score is an integer from 0 to 100 and that the verdict matches the score. It does not define a detailed point-by-point rubric, such as fixed percentages for correctness, examples, or clarity. The language model makes the judgement within those instructions. If evaluation cannot produce valid data and the fallback is used, the answer receives 0.

## 2. Verdict bands

The shared scoring rules assign a verdict to each answer:

| Answer score | Verdict |
| --- | --- |
| 70-100 | Good |
| 40-69 | Average |
| 0-39 | Poor |

A score of 70 or more can be a Good answer verdict. This is different from the dashboard's 75% Strong Area threshold.

## 3. Overall interview score

When an interview is finished, the server averages the scores of all its questions:

**Interview score (0-10) = average answer score (0-100) divided by 10**

The report shows this on a 0-10 scale. The dashboard converts it back to a percentage:

**Dashboard overall (%) = interview score multiplied by 10**

The performance trend plots one overall percentage for each completed interview. Latest vs Previous is the latest overall score minus the previous overall score, in percentage points. Highest Score is the highest single interview score in the current selection. The headline Overall Score is the average of the selected interviews.

## 4. Metric scores shown in reports and dashboard

The dashboard reads interview question fields and averages available values across the interview. It then displays the metric values as percentages. The role-wise chart averages interview metrics for each role.

**Current implementation limitation:** the current evaluation prompt returns one general answer score, not separate technical, communication, and confidence judgements. The sanitizer copies that one score, converted to 0-10, into the legacy technical-accuracy, communication, confidence, and completeness fields. Therefore Technical Knowledge, Communication, and Confidence currently come from the same underlying answer score. They should not be interpreted as independently measured abilities.

Problem Solving is currently set to null by the evaluator, so it is absent for new evaluations. Older records may contain values. The dashboard notes that this metric is available only for interviews evaluated after it was added.

## 5. Strong Areas

Strong Areas require an average of at least **75%** and scores from at least **two interviews** in the selected period.

- With a specific role selected, the dashboard evaluates the area's average for that role.
- With All Roles selected, it groups each metric and resume skill by role. A qualifying result is labelled with its role (for example, "Technical Knowledge - SQL"). This lets strong performance in one role appear even if other roles lower the all-role average.
- The displayed value is the average for that role and area.

If no area meets both conditions, the panel remains empty. A high score from only one interview is not enough.

## 6. Areas to Improve

Areas to Improve lists areas averaging **below 70%** with scores from at least **two interviews** in the selected role and period. With All Roles selected, this panel uses the combined selected interviews; its values may therefore differ from the role-specific Strong Areas.

Scores from 70% through 74% meet neither the Strong threshold nor the below-70% improvement threshold.

## 7. Resume skill scores

For each completed interview, the server looks at skills and technologies extracted from the resume linked to that interview. It selects questions whose question text contains the skill name and averages those questions' answer scores. A skill with no matching question is omitted.

**Current implementation limitation:** answer scores are stored on a 0-100 scale, and the dashboard percentage helper multiplies values by 10 because it expects a 0-10 scale. The server currently sends skill averages on the 0-100 scale, so skill percentages in the dashboard can be overstated. The role-specific Strong Areas logic uses the same conversion. Treat displayed resume-skill percentages cautiously until the scales are aligned.

## 8. Graphs and insights

- **Performance Improvement:** overall interview percentage over time, oldest to newest, for the selected role and period.
- **Latest vs Previous:** compares the two latest selected interviews.
- **Role-wise Performance:** average overall and available metric percentages for each role.
- **Quick Insights:** reports the first-to-latest overall change, the highest measured area, the lowest qualifying improvement area, and an upward communication trend when the recent communication average exceeds the earlier average by more than 0.3 points on the 0-10 scale.
- **Filters:** role and time-period selections affect the dashboard data. The default period is the last 30 days; All Time removes the date cutoff.

## How to interpret these scores

These are practice estimates generated by an AI evaluator, not a hiring decision or a validated psychometric assessment. Compare interviews with similar roles, question types, and experience levels for a more useful trend. Because some metric fields currently reuse the same answer score, the dashboard should not be read as measuring technical skill, communication, and confidence independently.
