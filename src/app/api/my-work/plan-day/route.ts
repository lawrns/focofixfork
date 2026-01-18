/**
 * Plan My Day API
 * AI-powered day planning that organizes tasks into Now/Next/Later/Waiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all user's tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('work_items')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'done')
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true });

    if (tasksError) {
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No tasks to plan',
        organized: { now: 0, next: 0, later: 0, waiting: 0 }
      });
    }

    // AI-powered task organization logic
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    let nowCount = 0;
    let nextCount = 0;
    let laterCount = 0;
    let waitingCount = 0;

    for (const task of tasks) {
      let newSection = 'later'; // default

      // Blocked tasks go to waiting
      if (task.status === 'blocked') {
        newSection = 'waiting';
        waitingCount++;
      }
      // Urgent or high priority tasks with due dates today or overdue go to now
      else if (
        (task.priority === 'urgent' || task.priority === 'high') &&
        task.due_date &&
        new Date(task.due_date) <= tomorrow
      ) {
        newSection = 'now';
        nowCount++;
      }
      // Tasks due within next week or in progress go to next
      else if (
        task.status === 'in_progress' ||
        (task.due_date && new Date(task.due_date) <= nextWeek)
      ) {
        newSection = 'next';
        nextCount++;
      }
      // High priority tasks without due dates go to next
      else if (task.priority === 'urgent' || task.priority === 'high') {
        newSection = 'next';
        nextCount++;
      }
      // Everything else stays in later
      else {
        laterCount++;
      }

      // Update task section in database
      await supabase
        .from('work_items')
        .update({ 
          section: newSection,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);
    }

    return NextResponse.json({
      success: true,
      message: `Organized ${tasks.length} tasks for your day`,
      organized: {
        now: nowCount,
        next: nextCount,
        later: laterCount,
        waiting: waitingCount,
      },
    });

  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
