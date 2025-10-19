# Power-Ups Development Guide

Complete guide for developing extensions and power-ups for Foco.

## Overview

Power-ups are extensions that add functionality to Foco projects. They can:
- Add custom fields to cards
- Integrate with external services
- Provide new views and interfaces
- Automate workflows
- Add reporting capabilities

## Extension API

### Basic Structure

```typescript
interface Extension {
  id: string
  name: string
  version: string
  description: string
  author: string
  category: 'productivity' | 'integration' | 'automation' | 'reporting'
  permissions: Permission[]
  manifest: ExtensionManifest
  initialize: () => Promise<void>
  destroy: () => Promise<void>
}

interface ExtensionManifest {
  name: string
  version: string
  description: string
  icon: string
  entry: string
  permissions: string[]
  settings: Setting[]
  events: Event[]
  actions: Action[]
}
```

### Creating Your First Extension

1. **Create the extension directory**:
   ```
   src/extensions/my-extension/
   ├── index.ts
   ├── manifest.json
   ├── settings.ts
   └── components/
       └── MyExtensionComponent.tsx
   ```

2. **Define the manifest**:
   ```json
   {
     "name": "My Extension",
     "version": "1.0.0",
     "description": "A sample extension",
     "icon": "icon.svg",
     "entry": "index.ts",
     "permissions": ["read:cards", "write:cards"],
     "settings": [
       {
         "key": "apiKey",
         "type": "string",
         "label": "API Key",
         "required": true
       }
     ],
     "events": ["card.created", "card.updated"],
     "actions": [
       {
         "id": "sync-data",
         "label": "Sync Data",
         "description": "Sync data with external service"
       }
     ]
   }
   ```

3. **Implement the extension**:
   ```typescript
   import { Extension, ExtensionAPI } from '@/lib/extensions/extension-api'

   class MyExtension implements Extension {
     id = 'my-extension'
     name = 'My Extension'
     version = '1.0.0'
     description = 'A sample extension'
     author = 'Your Name'
     category = 'productivity'
     
     permissions = [
       { resource: 'cards', action: 'read' },
       { resource: 'cards', action: 'write' }
     ]

     manifest = {
       name: this.name,
       version: this.version,
       description: this.description,
       icon: 'icon.svg',
       entry: 'index.ts',
       permissions: ['read:cards', 'write:cards'],
       settings: [
         {
           key: 'apiKey',
           type: 'string',
           label: 'API Key',
           required: true
         }
       ],
       events: ['card.created', 'card.updated'],
       actions: [
         {
           id: 'sync-data',
           label: 'Sync Data',
           description: 'Sync data with external service'
         }
       ]
     }

     async initialize() {
       console.log('My Extension initialized')
     }

     async destroy() {
       console.log('My Extension destroyed')
     }
   }

   export default new MyExtension()
   ```

## Built-in Power-Ups

### GitHub Integration

**Features**:
- Link cards to GitHub issues
- Show PR status on cards
- Create branches from cards
- Sync status bidirectionally
- Show commit activity

**Usage**:
```typescript
import { githubIntegration } from '@/lib/power-ups/github-integration'

// Link card to issue
await githubIntegration.linkCardToIssue(cardId, issueNumber)

// Create branch from card
await githubIntegration.createBranchFromCard(cardId, branchName)

// Sync status
await githubIntegration.syncStatus(cardId)
```

**Configuration**:
- GitHub Personal Access Token
- Repository selection
- Branch naming convention
- Auto-sync frequency

### Calendar Integration

**Features**:
- Calendar view for due dates
- Drag to reschedule
- Month/week/day views
- Color-code by project
- Export to Google Calendar

**Usage**:
```typescript
import { calendarIntegration } from '@/lib/power-ups/calendar-integration'

// Add to calendar
await calendarIntegration.addToCalendar(taskId, date)

// Sync with Google Calendar
await calendarIntegration.syncWithGoogle()

// Export events
await calendarIntegration.exportEvents(format)
```

**Configuration**:
- Google Calendar API key
- Calendar selection
- Sync frequency
- Event templates

### Time Tracking

**Features**:
- Start/stop timer on cards
- Log time manually
- Weekly timesheet view
- Export for billing
- Team time reports

**Usage**:
```typescript
import { timeTracking } from '@/lib/power-ups/time-tracking'

// Start timer
await timeTracking.startTimer(taskId)

// Stop timer
await timeTracking.stopTimer(taskId)

// Log time manually
await timeTracking.logTime(taskId, duration, description)

// Generate report
await timeTracking.generateReport(startDate, endDate)
```

**Configuration**:
- Time format (12/24 hour)
- Rounding rules
- Billing rates
- Report templates

### Custom Fields

**Features**:
- Add custom fields to cards
- Field templates
- Bulk edit custom fields
- Filter by custom field values
- Export including custom fields

**Usage**:
```typescript
import { customFields } from '@/lib/power-ups/custom-fields'

// Add custom field
await customFields.addField(projectId, {
  name: 'Priority',
  type: 'select',
  options: ['Low', 'Medium', 'High', 'Critical']
})

// Set field value
await customFields.setFieldValue(cardId, 'Priority', 'High')

// Get field value
const value = await customFields.getFieldValue(cardId, 'Priority')
```

**Configuration**:
- Field types (text, number, select, date, checkbox)
- Validation rules
- Default values
- Display options

## Extension Development

### Setting Up Development Environment

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create extension directory**:
   ```bash
   mkdir src/extensions/my-extension
   cd src/extensions/my-extension
   ```

3. **Initialize extension**:
   ```bash
   npm init -y
   ```

### Extension Lifecycle

1. **Registration**: Extension is registered with the system
2. **Initialization**: Extension is loaded and initialized
3. **Activation**: Extension becomes active and can receive events
4. **Deactivation**: Extension is deactivated but remains loaded
5. **Destruction**: Extension is unloaded and cleaned up

### Event System

Extensions can listen to and emit events:

```typescript
// Listen to events
extensionAPI.on('card.created', (card) => {
  console.log('New card created:', card)
})

// Emit events
extensionAPI.emit('custom.event', { data: 'value' })
```

**Available Events**:
- `card.created` - New card created
- `card.updated` - Card updated
- `card.deleted` - Card deleted
- `project.created` - New project created
- `project.updated` - Project updated
- `user.joined` - User joined project
- `user.left` - User left project

### API Access

Extensions have access to a scoped API:

```typescript
// Read cards
const cards = await extensionAPI.cards.read({ projectId })

// Update card
await extensionAPI.cards.update(cardId, { title: 'New Title' })

// Create card
const newCard = await extensionAPI.cards.create({
  title: 'New Card',
  projectId
})
```

**Available Resources**:
- `cards` - Card management
- `projects` - Project management
- `users` - User management
- `labels` - Label management
- `attachments` - File attachments

### Permissions

Extensions must declare permissions:

```typescript
permissions: [
  { resource: 'cards', action: 'read' },
  { resource: 'cards', action: 'write' },
  { resource: 'projects', action: 'read' }
]
```

**Permission Types**:
- `read` - Read access to resource
- `write` - Write access to resource
- `delete` - Delete access to resource
- `admin` - Administrative access

### Settings

Extensions can define settings:

```typescript
settings: [
  {
    key: 'apiKey',
    type: 'string',
    label: 'API Key',
    description: 'Your API key for the service',
    required: true,
    sensitive: true
  },
  {
    key: 'autoSync',
    type: 'boolean',
    label: 'Auto Sync',
    description: 'Automatically sync data',
    default: false
  }
]
```

**Setting Types**:
- `string` - Text input
- `number` - Number input
- `boolean` - Checkbox
- `select` - Dropdown
- `multiselect` - Multi-select dropdown
- `textarea` - Multi-line text

### UI Components

Extensions can add UI components:

```typescript
// Add component to card
extensionAPI.addCardComponent('my-extension', MyCardComponent)

// Add component to project
extensionAPI.addProjectComponent('my-extension', MyProjectComponent)

// Add component to settings
extensionAPI.addSettingsComponent('my-extension', MySettingsComponent)
```

### Error Handling

Extensions should handle errors gracefully:

```typescript
try {
  await extensionAPI.cards.update(cardId, data)
} catch (error) {
  console.error('Extension error:', error)
  // Show user-friendly error message
  extensionAPI.showError('Failed to update card')
}
```

## Security Guidelines

### Code Review Process

1. **Security Review**: All extensions undergo security review
2. **Permission Audit**: Permissions are audited for necessity
3. **API Usage**: API usage is monitored and limited
4. **Data Access**: Data access is logged and audited

### Best Practices

1. **Minimal Permissions**: Request only necessary permissions
2. **Secure Storage**: Store sensitive data securely
3. **Input Validation**: Validate all user inputs
4. **Error Handling**: Handle errors gracefully
5. **Rate Limiting**: Respect API rate limits

### Security Checklist

- [ ] Extension uses minimal required permissions
- [ ] All user inputs are validated
- [ ] Sensitive data is stored securely
- [ ] API calls are rate limited
- [ ] Error messages don't expose sensitive information
- [ ] Extension handles network failures gracefully
- [ ] Extension doesn't access browser storage directly
- [ ] Extension doesn't make external API calls without permission

## Publishing Process

### Submission Requirements

1. **Extension Package**: Complete extension package
2. **Documentation**: Comprehensive documentation
3. **Tests**: Unit and integration tests
4. **Screenshots**: Screenshots of extension in action
5. **Privacy Policy**: Privacy policy if extension collects data

### Review Process

1. **Automated Testing**: Automated security and functionality tests
2. **Manual Review**: Manual code review by team
3. **User Testing**: User testing with beta users
4. **Approval**: Final approval for publication

### Distribution

1. **Extension Marketplace**: Published to marketplace
2. **Version Management**: Version updates and rollbacks
3. **User Feedback**: User reviews and ratings
4. **Analytics**: Usage analytics and metrics

## Examples

### Simple Text Field Extension

```typescript
class TextFieldExtension implements Extension {
  id = 'text-field'
  name = 'Text Field'
  version = '1.0.0'
  description = 'Adds a simple text field to cards'
  
  async initialize() {
    // Add text field to cards
    extensionAPI.addCardComponent('text-field', TextFieldComponent)
  }
}
```

### API Integration Extension

```typescript
class APIIntegrationExtension implements Extension {
  id = 'api-integration'
  name = 'API Integration'
  version = '1.0.0'
  description = 'Integrates with external API'
  
  async initialize() {
    // Set up API client
    const apiClient = new APIClient(this.settings.apiKey)
    
    // Listen to card events
    extensionAPI.on('card.created', async (card) => {
      await apiClient.createItem(card)
    })
  }
}
```

## Troubleshooting

### Common Issues

1. **Extension Not Loading**: Check manifest and entry point
2. **Permission Denied**: Verify permissions are correct
3. **API Errors**: Check API credentials and rate limits
4. **UI Not Rendering**: Check component registration
5. **Settings Not Saving**: Verify settings schema

### Debug Mode

Enable debug mode for development:

```typescript
// In extension
if (process.env.NODE_ENV === 'development') {
  console.log('Extension debug mode enabled')
}
```

### Getting Help

- **Documentation**: Check this guide and API docs
- **Community**: Join the developer community
- **Support**: Contact support for technical issues
- **Examples**: Look at built-in extensions for examples

## Resources

- **Extension API Documentation**: `/docs/api/extensions`
- **Built-in Extensions**: `/src/lib/power-ups/`
- **Extension Marketplace**: `/extensions`
- **Developer Community**: `/community`
- **Support**: `/support`
