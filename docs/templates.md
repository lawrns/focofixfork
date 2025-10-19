# Template Creation Guide

Complete guide for creating and managing templates in Foco.

## Overview

Templates are pre-configured project structures that help users get started quickly. They include:
- Project structure and settings
- Predefined columns and statuses
- Sample cards and tasks
- Checklists and labels
- Custom fields and configurations

## Template Types

### Project Templates

Project templates define the overall structure of a project:

```typescript
interface ProjectTemplate {
  id: string
  name: string
  description: string
  category: 'marketing' | 'engineering' | 'design' | 'sales' | 'personal'
  isPublic: boolean
  createdBy: string
  data: {
    columns: Column[]
    sampleCards: Card[]
    labels: Label[]
    checklists: Checklist[]
    customFields: CustomField[]
    settings: ProjectSettings
  }
}
```

### Board Templates

Board templates define the structure of a specific board:

```typescript
interface BoardTemplate {
  id: string
  name: string
  description: string
  projectId: string
  data: {
    columns: Column[]
    sampleCards: Card[]
    labels: Label[]
    settings: BoardSettings
  }
}
```

### Card Templates

Card templates define reusable card structures:

```typescript
interface CardTemplate {
  id: string
  name: string
  description: string
  category: 'bug-report' | 'user-story' | 'design-review' | 'meeting'
  data: {
    title: string
    description: string
    checklist: ChecklistItem[]
    labels: string[]
    customFields: Record<string, any>
  }
}
```

## Creating Templates

### Project Template Creation

1. **Define the template structure**:
   ```typescript
   const agileSprintTemplate: ProjectTemplate = {
     id: 'agile-sprint',
     name: 'Agile Sprint Board',
     description: 'Template for agile development sprints',
     category: 'engineering',
     isPublic: true,
     createdBy: 'system',
     data: {
       columns: [
         { name: 'Backlog', position: 0, color: '#gray' },
         { name: 'To Do', position: 1, color: '#blue' },
         { name: 'In Progress', position: 2, color: '#yellow' },
         { name: 'Review', position: 3, color: '#orange' },
         { name: 'Done', position: 4, color: '#green' }
       ],
       sampleCards: [
         {
           title: 'Sample User Story',
           description: 'As a user, I want to...',
           columnId: 'backlog',
           labels: ['user-story'],
           checklist: [
             { text: 'Define acceptance criteria', completed: false },
             { text: 'Create mockups', completed: false },
             { text: 'Implement feature', completed: false }
           ]
         }
       ],
       labels: [
         { name: 'User Story', color: '#blue' },
         { name: 'Bug', color: '#red' },
         { name: 'Enhancement', color: '#green' },
         { name: 'Epic', color: '#purple' }
       ],
       checklists: [],
       customFields: [
         {
           name: 'Story Points',
           type: 'number',
           defaultValue: 0
         },
         {
           name: 'Priority',
           type: 'select',
           options: ['Low', 'Medium', 'High', 'Critical'],
           defaultValue: 'Medium'
         }
       ],
       settings: {
         allowGuestAccess: false,
         requireApproval: true,
         autoArchive: true
       }
     }
   }
   ```

2. **Save the template**:
   ```typescript
   await templateService.saveProjectTemplate(agileSprintTemplate)
   ```

### Board Template Creation

1. **Create from existing board**:
   ```typescript
   const boardTemplate = await templateService.createBoardTemplate({
     name: 'Marketing Campaign Board',
     description: 'Template for marketing campaigns',
     projectId: currentProjectId,
     includeSampleData: true
   })
   ```

2. **Define custom structure**:
   ```typescript
   const customBoardTemplate: BoardTemplate = {
     id: 'marketing-campaign',
     name: 'Marketing Campaign Board',
     description: 'Template for marketing campaigns',
     projectId: 'marketing',
     data: {
       columns: [
         { name: 'Ideas', position: 0, color: '#purple' },
         { name: 'Planning', position: 1, color: '#blue' },
         { name: 'Production', position: 2, color: '#yellow' },
         { name: 'Review', position: 3, color: '#orange' },
         { name: 'Published', position: 4, color: '#green' }
       ],
       sampleCards: [
         {
           title: 'Social Media Campaign',
           description: 'Plan and execute social media campaign',
           columnId: 'planning',
           labels: ['social-media', 'campaign'],
           dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
         }
       ],
       labels: [
         { name: 'Social Media', color: '#blue' },
         { name: 'Email', color: '#green' },
         { name: 'Content', color: '#purple' },
         { name: 'Analytics', color: '#orange' }
       ],
       settings: {
         allowGuestAccess: true,
         requireApproval: false,
         autoArchive: false
       }
     }
   }
   ```

### Card Template Creation

1. **Define card structure**:
   ```typescript
   const bugReportTemplate: CardTemplate = {
     id: 'bug-report',
     name: 'Bug Report',
     description: 'Template for reporting bugs',
     category: 'bug-report',
     data: {
       title: 'Bug: [Brief Description]',
       description: '## Description\n\nDescribe the bug...\n\n## Steps to Reproduce\n\n1. Step 1\n2. Step 2\n3. Step 3\n\n## Expected Behavior\n\nWhat should happen?\n\n## Actual Behavior\n\nWhat actually happens?\n\n## Environment\n\n- OS: \n- Browser: \n- Version: ',
       checklist: [
         { text: 'Reproduce the bug', completed: false },
         { text: 'Document steps to reproduce', completed: false },
         { text: 'Test fix', completed: false },
         { text: 'Update documentation', completed: false }
       ],
       labels: ['bug', 'needs-triage'],
       customFields: {
         'Severity': 'Medium',
         'Priority': 'Medium',
         'Component': '',
         'Version': ''
       }
     }
   }
   ```

2. **Apply template to card**:
   ```typescript
   await templateService.applyCardTemplate(cardId, bugReportTemplate.id)
   ```

## Template Categories

### Marketing Templates

- **Content Calendar**: Plan and schedule content
- **Campaign Planning**: Organize marketing campaigns
- **Social Media**: Manage social media content
- **Email Marketing**: Plan email campaigns
- **Event Planning**: Organize events and conferences

### Engineering Templates

- **Agile Sprint**: Agile development workflow
- **Bug Tracking**: Bug reporting and resolution
- **Feature Development**: Feature planning and development
- **Code Review**: Code review process
- **Release Planning**: Software release planning

### Design Templates

- **Design Review**: Design feedback and iteration
- **User Research**: User research and testing
- **Prototype Testing**: Prototype testing and feedback
- **Design System**: Design system development
- **Creative Brief**: Creative project briefs

### Sales Templates

- **Sales Pipeline**: Sales process management
- **Lead Qualification**: Lead scoring and qualification
- **Proposal Writing**: Proposal creation and review
- **Customer Onboarding**: New customer onboarding
- **Account Management**: Account management and growth

### Personal Templates

- **Personal Projects**: Personal project management
- **Goal Tracking**: Personal goal setting and tracking
- **Habit Tracking**: Habit formation and tracking
- **Learning**: Learning and skill development
- **Home Management**: Home and family management

## Template Best Practices

### Design Principles

1. **Simplicity**: Keep templates simple and focused
2. **Flexibility**: Allow customization and modification
3. **Completeness**: Include all necessary elements
4. **Clarity**: Use clear, descriptive names and descriptions
5. **Consistency**: Maintain consistent structure and naming

### Content Guidelines

1. **Relevant Examples**: Include realistic, relevant examples
2. **Clear Instructions**: Provide clear instructions for use
3. **Appropriate Labels**: Use appropriate labels and colors
4. **Useful Checklists**: Include helpful checklist items
5. **Proper Structure**: Organize content logically

### Technical Considerations

1. **Performance**: Optimize for performance and loading speed
2. **Compatibility**: Ensure compatibility across devices
3. **Accessibility**: Make templates accessible to all users
4. **Maintainability**: Design for easy maintenance and updates
5. **Scalability**: Consider scalability and growth

## Template Management

### Creating Templates

1. **Plan the structure**: Define columns, labels, and sample content
2. **Create sample data**: Add realistic sample cards and tasks
3. **Test the template**: Test the template with different scenarios
4. **Document usage**: Provide clear documentation and examples
5. **Publish**: Make the template available to users

### Updating Templates

1. **Version control**: Maintain version history of templates
2. **Backward compatibility**: Ensure updates don't break existing projects
3. **User notification**: Notify users of template updates
4. **Migration support**: Provide migration tools for existing projects
5. **Rollback capability**: Allow rollback to previous versions

### Sharing Templates

1. **Public templates**: Make templates available to all users
2. **Team templates**: Share templates within teams
3. **Private templates**: Keep templates private to creator
4. **Template marketplace**: Create a marketplace for community templates
5. **Import/export**: Allow importing and exporting templates

## Template Examples

### Agile Sprint Template

```typescript
const agileSprintTemplate = {
  name: 'Agile Sprint Board',
  description: 'Template for agile development sprints with user stories, bugs, and tasks',
  category: 'engineering',
  columns: [
    { name: 'Product Backlog', color: '#gray' },
    { name: 'Sprint Backlog', color: '#blue' },
    { name: 'In Progress', color: '#yellow' },
    { name: 'Code Review', color: '#orange' },
    { name: 'Testing', color: '#purple' },
    { name: 'Done', color: '#green' }
  ],
  labels: [
    { name: 'User Story', color: '#blue' },
    { name: 'Bug', color: '#red' },
    { name: 'Technical Debt', color: '#orange' },
    { name: 'Epic', color: '#purple' }
  ],
  sampleCards: [
    {
      title: 'User Story: Login Feature',
      description: 'As a user, I want to log in to the application so that I can access my account.',
      column: 'Product Backlog',
      labels: ['User Story'],
      checklist: [
        'Define acceptance criteria',
        'Create mockups',
        'Implement login form',
        'Add authentication',
        'Test login flow'
      ]
    }
  ]
}
```

### Content Calendar Template

```typescript
const contentCalendarTemplate = {
  name: 'Content Calendar',
  description: 'Template for planning and scheduling content across multiple channels',
  category: 'marketing',
  columns: [
    { name: 'Ideas', color: '#purple' },
    { name: 'Planning', color: '#blue' },
    { name: 'Writing', color: '#yellow' },
    { name: 'Review', color: '#orange' },
    { name: 'Scheduled', color: '#green' },
    { name: 'Published', color: '#gray' }
  ],
  labels: [
    { name: 'Blog Post', color: '#blue' },
    { name: 'Social Media', color: '#green' },
    { name: 'Email', color: '#purple' },
    { name: 'Video', color: '#red' },
    { name: 'Infographic', color: '#orange' }
  ],
  sampleCards: [
    {
      title: 'Monthly Newsletter',
      description: 'Create and send monthly newsletter to subscribers',
      column: 'Planning',
      labels: ['Email'],
      dueDate: '2024-01-31',
      checklist: [
        'Gather content ideas',
        'Write newsletter content',
        'Design newsletter template',
        'Review and edit',
        'Schedule send time',
        'Send newsletter'
      ]
    }
  ]
}
```

## Troubleshooting

### Common Issues

1. **Template not loading**: Check template structure and syntax
2. **Missing elements**: Verify all required elements are included
3. **Permission errors**: Check user permissions for template access
4. **Import failures**: Validate template format and structure
5. **Performance issues**: Optimize template size and complexity

### Debug Mode

Enable debug mode for template development:

```typescript
// In template service
if (process.env.NODE_ENV === 'development') {
  console.log('Template debug mode enabled')
}
```

### Getting Help

- **Documentation**: Check this guide and API docs
- **Community**: Join the template creator community
- **Support**: Contact support for technical issues
- **Examples**: Look at built-in templates for examples

## Resources

- **Template API Documentation**: `/docs/api/templates`
- **Built-in Templates**: `/src/lib/templates/`
- **Template Gallery**: `/templates`
- **Creator Community**: `/community`
- **Support**: `/support`
