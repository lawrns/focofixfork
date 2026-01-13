import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateNextRecurrenceDate, shouldCreateNextInstance } from '@/features/tasks/services/recurrence.service';
import type { RecurrencePattern } from '@/lib/validation/schemas/task.schema';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    // Validate request is from authorized source (webhook key or internal)
    const authHeader = req.headers.get('authorization');
    const webhookKey = process.env.RECURRENCE_WEBHOOK_KEY;

    if (!authHeader || !webhookKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!authHeader.startsWith(`Bearer ${webhookKey}`)) {
      return NextResponse.json(
        { success: false, error: 'Invalid webhook key' },
        { status: 401 }
      );
    }

    const now = new Date();

    // Find all recurring tasks where next_occurrence_date is past due
    const { data: tasksToProcess, error: fetchError } = await supabase
      .from('work_items')
      .select('*')
      .eq('is_recurring', true)
      .not('next_occurrence_date', 'is', null)
      .lte('next_occurrence_date', now.toISOString())
      .order('next_occurrence_date', { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error('Error fetching recurring tasks:', fetchError);
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      );
    }

    let createdCount = 0;
    const errors = [];

    for (const task of tasksToProcess || []) {
      try {
        const patternData = task.recurrence_pattern as Partial<RecurrencePattern>;
        const occurrenceCount = task.occurrence_number || 1;

        // Validate pattern has required type field
        if (!patternData || !patternData.type) {
          continue;
        }

        // Now we know type exists, assert as valid pattern
        const pattern = patternData as RecurrencePattern;

        // Check if recurrence should continue
        if (!shouldCreateNextInstance(pattern, new Date(), occurrenceCount)) {
          continue;
        }

        // Calculate next occurrence date
        const dueDate = task.due_date ? new Date(task.due_date) : new Date();
        const nextDate = calculateNextRecurrenceDate(dueDate, pattern, occurrenceCount);

        if (!nextDate) {
          continue;
        }

        // Calculate the date after next for caching
        const dateAfterNext = calculateNextRecurrenceDate(nextDate, pattern, occurrenceCount + 1);

        // Create the next task instance
        const newTask = {
          title: task.title,
          description: task.description,
          project_id: task.project_id,
          parent_id: task.parent_id,
          priority: task.priority,
          assignee_id: task.assignee_id,
          due_date: nextDate.toISOString().split('T')[0],
          reporter_id: task.reporter_id,
          is_recurring: true,
          recurrence_pattern: pattern,
          parent_recurring_task_id: task.parent_recurring_task_id || task.id,
          occurrence_number: occurrenceCount + 1,
          next_occurrence_date: dateAfterNext?.toISOString() || null,
          status: 'todo',
        };

        const { error: insertError } = await supabase
          .from('work_items')
          .insert([newTask]);

        if (insertError) {
          errors.push({
            taskId: task.id,
            error: insertError.message,
          });
        } else {
          createdCount++;
        }
      } catch (err: any) {
        errors.push({
          taskId: task.id,
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${tasksToProcess?.length || 0} recurring tasks`,
      createdCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('POST /api/tasks/process-recurrence error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const webhookKey = process.env.RECURRENCE_WEBHOOK_KEY;

    if (!authHeader || !webhookKey || !authHeader.startsWith(`Bearer ${webhookKey}`)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get stats about recurring tasks
    const { data: allRecurring, error: error1 } = await supabase
      .from('work_items')
      .select('count')
      .eq('is_recurring', true);

    const { data: overdue, error: error2 } = await supabase
      .from('work_items')
      .select('count')
      .eq('is_recurring', true)
      .not('next_occurrence_date', 'is', null)
      .lte('next_occurrence_date', new Date().toISOString());

    if (error1 || error2) {
      throw new Error('Failed to fetch statistics');
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalRecurringTasks: allRecurring?.[0]?.count || 0,
        overdueRecurrences: overdue?.[0]?.count || 0,
      },
    });
  } catch (err: any) {
    console.error('GET /api/tasks/process-recurrence error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
