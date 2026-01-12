import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api/auth-helper';
import { calculateNextRecurrenceDate, shouldCreateNextInstance } from '@/features/tasks/services/recurrence.service';
import type { RecurrencePattern } from '@/lib/validation/schemas/task.schema';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthUser(req);

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    if (!task.is_recurring || !task.recurrence_pattern) {
      return NextResponse.json(
        { success: false, error: 'Task is not recurring' },
        { status: 400 }
      );
    }

    const patternData = task.recurrence_pattern as Partial<RecurrencePattern>;
    const occurrenceCount = task.occurrence_number || 1;

    // Validate pattern has required type field
    if (!patternData.type) {
      return NextResponse.json(
        { success: false, error: 'Invalid recurrence pattern' },
        { status: 400 }
      );
    }

    // Now we know type exists, assert as valid pattern
    const pattern = patternData as RecurrencePattern;

    // @ts-expect-error - patternData comes from DB which has optional fields, but we validated type exists above
    if (!shouldCreateNextInstance(pattern, new Date(), occurrenceCount)) {
      return NextResponse.json(
        { success: false, error: 'Recurrence has ended' },
        { status: 400 }
      );
    }

    const nextDate = calculateNextRecurrenceDate(
      task.due_date ? new Date(task.due_date) : new Date(),
      // @ts-expect-error - pattern validated above with type check
      pattern,
      occurrenceCount
    );

    if (!nextDate) {
      return NextResponse.json(
        { success: false, error: 'No more recurrences available' },
        { status: 400 }
      );
    }

    const nextTask = {
      title: task.title,
      description: task.description,
      project_id: task.project_id,
      milestone_id: task.milestone_id,
      priority: task.priority,
      assignee_id: task.assignee_id,
      due_date: nextDate.toISOString().split('T')[0],
      created_by: user.id,
      is_recurring: true,
      recurrence_pattern: pattern,
      parent_recurring_task_id: task.parent_recurring_task_id || id,
      occurrence_number: occurrenceCount + 1,
      // @ts-expect-error - pattern validated above with type check
      next_occurrence_date: calculateNextRecurrenceDate(nextDate, pattern, occurrenceCount + 1)?.toISOString() || null,
      status: 'todo',
    };

    const { data: createdTask, error: createError } = await supabase
      .from('tasks')
      .insert([nextTask])
      .select()
      .single();

    if (createError) {
      console.error('Error creating next recurring task:', createError);
      return NextResponse.json(
        { success: false, error: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: createdTask,
      message: 'Next recurring task created successfully',
    });
  } catch (err: any) {
    console.error('POST /api/tasks/[id]/create-next error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
