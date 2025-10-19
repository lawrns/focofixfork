'use client'

interface NotificationTrigger {
  type: 'task_assigned' | 'task_mentioned' | 'project_updated' | 'deadline_approaching' | 'team_member_joined'
  userId: string
  data: any
}

class NotificationTriggerService {
  async sendTaskAssignedNotification(userId: string, taskData: any) {
    const trigger: NotificationTrigger = {
      type: 'task_assigned',
      userId,
      data: {
        taskId: taskData.id,
        taskTitle: taskData.title,
        projectName: taskData.project?.name,
        assignedBy: taskData.assignedBy?.name
      }
    }

    await this.sendNotification(trigger, {
      title: 'New task assigned',
      body: `${taskData.assignedBy?.name || 'Someone'} assigned you "${taskData.title}"`,
      icon: '/icons/task-assigned.png',
      tag: `task-${taskData.id}`,
      data: {
        type: 'task_assigned',
        taskId: taskData.id,
        projectId: taskData.project?.id
      },
      actions: [
        {
          action: 'view_task',
          title: 'View Task'
        },
        {
          action: 'mark_complete',
          title: 'Mark Complete'
        }
      ]
    })
  }

  async sendTaskMentionedNotification(userId: string, mentionData: any) {
    const trigger: NotificationTrigger = {
      type: 'task_mentioned',
      userId,
      data: {
        taskId: mentionData.taskId,
        taskTitle: mentionData.taskTitle,
        commentId: mentionData.commentId,
        mentionedBy: mentionData.mentionedBy?.name
      }
    }

    await this.sendNotification(trigger, {
      title: 'You were mentioned',
      body: `${mentionData.mentionedBy?.name || 'Someone'} mentioned you in "${mentionData.taskTitle}"`,
      icon: '/icons/mention.png',
      tag: `mention-${mentionData.commentId}`,
      data: {
        type: 'task_mentioned',
        taskId: mentionData.taskId,
        commentId: mentionData.commentId
      },
      actions: [
        {
          action: 'view_comment',
          title: 'View Comment'
        }
      ]
    })
  }

  async sendProjectUpdatedNotification(userId: string, projectData: any) {
    const trigger: NotificationTrigger = {
      type: 'project_updated',
      userId,
      data: {
        projectId: projectData.id,
        projectName: projectData.name,
        updatedBy: projectData.updatedBy?.name,
        changes: projectData.changes
      }
    }

    await this.sendNotification(trigger, {
      title: 'Project updated',
      body: `${projectData.updatedBy?.name || 'Someone'} updated "${projectData.name}"`,
      icon: '/icons/project-updated.png',
      tag: `project-${projectData.id}`,
      data: {
        type: 'project_updated',
        projectId: projectData.id
      },
      actions: [
        {
          action: 'view_project',
          title: 'View Project'
        }
      ]
    })
  }

  async sendDeadlineApproachingNotification(userId: string, deadlineData: any) {
    const trigger: NotificationTrigger = {
      type: 'deadline_approaching',
      userId,
      data: {
        taskId: deadlineData.taskId,
        taskTitle: deadlineData.taskTitle,
        projectName: deadlineData.projectName,
        dueDate: deadlineData.dueDate,
        daysRemaining: deadlineData.daysRemaining
      }
    }

    const daysText = deadlineData.daysRemaining === 1 ? 'tomorrow' : `in ${deadlineData.daysRemaining} days`

    await this.sendNotification(trigger, {
      title: 'Deadline approaching',
      body: `"${deadlineData.taskTitle}" is due ${daysText}`,
      icon: '/icons/deadline.png',
      tag: `deadline-${deadlineData.taskId}`,
      data: {
        type: 'deadline_approaching',
        taskId: deadlineData.taskId,
        projectId: deadlineData.projectId
      },
      actions: [
        {
          action: 'view_task',
          title: 'View Task'
        },
        {
          action: 'extend_deadline',
          title: 'Extend Deadline'
        }
      ]
    })
  }

  async sendTeamMemberJoinedNotification(userId: string, memberData: any) {
    const trigger: NotificationTrigger = {
      type: 'team_member_joined',
      userId,
      data: {
        projectId: memberData.projectId,
        projectName: memberData.projectName,
        newMemberName: memberData.newMemberName,
        newMemberEmail: memberData.newMemberEmail
      }
    }

    await this.sendNotification(trigger, {
      title: 'New team member',
      body: `${memberData.newMemberName} joined "${memberData.projectName}"`,
      icon: '/icons/team-member.png',
      tag: `team-${memberData.projectId}`,
      data: {
        type: 'team_member_joined',
        projectId: memberData.projectId
      },
      actions: [
        {
          action: 'view_project',
          title: 'View Project'
        },
        {
          action: 'welcome_member',
          title: 'Welcome Member'
        }
      ]
    })
  }

  private async sendNotification(trigger: NotificationTrigger, notification: any) {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: trigger.userId,
          ...notification
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send notification')
      }

      console.log('[NotificationTrigger] Notification sent:', trigger.type, trigger.userId)
    } catch (error) {
      console.error('[NotificationTrigger] Failed to send notification:', error)
    }
  }
}

export const notificationTriggers = new NotificationTriggerService()
