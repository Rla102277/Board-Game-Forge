export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: "json" | "markdown" | "html" | "pdf" | "csv";
  template: string;
  variables: string[];
  isCustom: boolean;
  createdAt: string;
}

export const DEFAULT_TEMPLATES: ExportTemplate[] = [
  {
    id: "rulebook-standard",
    name: "Standard Rulebook",
    description: "Complete rulebook with all sections",
    format: "markdown",
    template: `# {{projectName}} Rulebook

## Overview
{{description}}

## Components
{{#each entities}}
- {{name}}: {{description}}
{{/each}}

## Rules
{{#each rules}}
### {{title}}
{{content}}
{{/each}}

## Players
{{#each players}}
- {{name}}: {{description}}
{{/each}}
`,
    variables: ["projectName", "description", "entities", "rules", "players"],
    isCustom: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "component-list",
    name: "Component List",
    description: "List all game components",
    format: "csv",
    template: "Name,Type,Quantity,Notes\n{{#each entities}}{{name}},{{type}},1,{{description}}\n{{/each}}",
    variables: ["entities"],
    isCustom: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "design-document",
    name: "Design Document",
    description: "Comprehensive design document",
    format: "markdown",
    template: `# {{projectName}} Design Document

## Game Overview
- **Type**: {{gameType}}
- **Genre**: {{genre}}
- **Players**: {{playerCount}}
- **Duration**: {{targetDuration}}

## Description
{{description}}

## Entities
{{#each entities}}
### {{name}} ({{type}})
{{description}}
{{#if stats}}**Stats**: {{stats}}{{/if}}
{{/each}}

## Rules
{{#each rules}}
### {{title}}
**Category**: {{category}}
**Priority**: {{priority}}

{{content}}
{{/each}}
`,
    variables: ["projectName", "gameType", "genre", "playerCount", "targetDuration", "description", "entities", "rules"],
    isCustom: false,
    createdAt: new Date().toISOString(),
  },
];

export function createCustomTemplate(
  name: string,
  description: string,
  format: ExportTemplate["format"],
  template: string,
  variables: string[]
): ExportTemplate {
  return {
    id: `custom-${Date.now()}`,
    name,
    description,
    format,
    template,
    variables,
    isCustom: true,
    createdAt: new Date().toISOString(),
  };
}

export function renderTemplate(
  template: string,
  data: Record<string, any>
): string {
  let result = template;
  
  // Simple variable substitution {{variable}}
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(data[key] || ''));
  });
  
  // Handle {{#each array}} blocks (simple implementation)
  const eachRegex = /{{#each (\w+)}}([\s\S]*?){{\/each}}/g;
  result = result.replace(eachRegex, (match, arrayName, content) => {
    const array = data[arrayName];
    if (!Array.isArray(array)) return '';
    return array.map(item => {
      let itemContent = content;
      Object.keys(item).forEach(key => {
        const itemRegex = new RegExp(`{{${key}}}`, 'g');
        itemContent = itemContent.replace(itemRegex, String(item[key] || ''));
      });
      return itemContent;
    }).join('\n');
  });
  
  return result;
}

export function extractVariables(template: string): string[] {
  const variableRegex = /{{(\w+)}}/g;
  const variables = new Set<string>();
  let match;
  
  while ((match = variableRegex.exec(template)) !== null) {
    if (!match[1].startsWith('each')) {
      variables.add(match[1]);
    }
  }
  
  return Array.from(variables);
}
