import { Injectable, Logger } from '@nestjs/common';

import {
  ComponentDefinition,
  ComponentCategory,
  PropSchema,
  ComponentSlot,
  ComponentEvent,
} from '../schema/v1/types';

/**
 * Component Registry Service
 * Manages registration and retrieval of UI components
 */
@Injectable()
export class ComponentRegistryService {
  private readonly logger = new Logger(ComponentRegistryService.name);
  
  // Component storage
  private readonly components = new Map<string, ComponentDefinition>();
  
  // Category index
  private readonly categories = new Map<ComponentCategory, Set<string>>();
  
  // Tag index
  private readonly tags = new Map<string, Set<string>>();

  constructor() {
    // Register built-in components
    this.registerBuiltInComponents();
  }

  /**
   * Register a component
   */
  register(component: ComponentDefinition): void {
    if (this.components.has(component.type)) {
      this.logger.warn(
        `Component ${component.type} already registered, overwriting`,
      );
    }
    
    this.components.set(component.type, component);
    
    // Index by category
    if (!this.categories.has(component.category)) {
      this.categories.set(component.category, new Set());
    }
    this.categories.get(component.category)!.add(component.type);
    
    // Index by tags
    if (component.tags) {
      for (const tag of component.tags) {
        if (!this.tags.has(tag)) {
          this.tags.set(tag, new Set());
        }
        this.tags.get(tag)!.add(component.type);
      }
    }
    
    this.logger.debug(`Registered component: ${component.type}`);
  }

  /**
   * Get component by type
   */
  get(type: string): ComponentDefinition | undefined {
    return this.components.get(type);
  }

  /**
   * Get all components
   */
  getAll(): ComponentDefinition[] {
    return Array.from(this.components.values());
  }

  /**
   * Get components by category
   */
  getByCategory(category: ComponentCategory): ComponentDefinition[] {
    const types = this.categories.get(category);
    if (!types) return [];
    
    return Array.from(types)
      .map((type) => this.components.get(type))
      .filter((c): c is ComponentDefinition => c !== undefined);
  }

  /**
   * Get components by tag
   */
  getByTag(tag: string): ComponentDefinition[] {
    const types = this.tags.get(tag);
    if (!types) return [];
    
    return Array.from(types)
      .map((type) => this.components.get(type))
      .filter((c): c is ComponentDefinition => c !== undefined);
  }

  /**
   * Check if component exists
   */
  has(type: string): boolean {
    return this.components.has(type);
  }

  /**
   * Get component props schema
   */
  getPropsSchema(type: string): PropSchema | undefined {
    const component = this.components.get(type);
    return component?.propsSchema;
  }

  /**
   * Get component slots
   */
  getSlots(type: string): Record<string, ComponentSlot> | undefined {
    const component = this.components.get(type);
    return component?.slots;
  }

  /**
   * Get component events
   */
  getEvents(type: string): ComponentEvent[] | undefined {
    const component = this.components.get(type);
    return component?.events;
  }

  /**
   * Check platform support
   */
  supportsPlatform(type: string, platform: 'web' | 'ios' | 'android'): boolean {
    const component = this.components.get(type);
    if (!component) return false;
    if (!component.platforms) return true; // Default: supports all
    return component.platforms.includes(platform);
  }

  /**
   * Check capability requirements
   */
  getRequiredCapabilities(type: string): string[] {
    const component = this.components.get(type);
    return component?.requiredCapabilities ?? [];
  }

  /**
   * Register built-in components
   */
  private registerBuiltInComponents(): void {
    // Display components
    this.registerTextComponent();
    this.registerImageComponent();
    this.registerIconComponent();
    this.registerBadgeComponent();
    this.registerAvatarComponent();
    this.registerCardComponent();
    this.registerDividerComponent();
    
    // Interactive components
    this.registerButtonComponent();
    this.registerLinkComponent();
    this.registerToggleComponent();
    this.registerSliderComponent();
    
    // Form components
    this.registerInputComponent();
    this.registerSelectComponent();
    this.registerCheckboxComponent();
    this.registerRadioComponent();
    this.registerTextAreaComponent();
    this.registerDatePickerComponent();
    this.registerFileUploadComponent();
    
    // Data components
    this.registerTableComponent();
    this.registerListComponent();
    this.registerTreeComponent();
    
    // Layout components
    this.registerGridComponent();
    this.registerFlexComponent();
    this.registerStackComponent();
    this.registerTabsComponent();
    this.registerModalComponent();
    this.registerDrawerComponent();
    
    this.logger.log(`Registered ${this.components.size} built-in components`);
  }

  private registerTextComponent(): void {
    this.register({
      type: 'Text',
      version: '1.0.0',
      displayName: 'Text',
      description: 'Text display component',
      category: 'display',
      tags: ['text', 'typography'],
      propsSchema: {
        content: { type: 'string', required: false },
        variant: { 
          type: 'enum', 
          required: false, 
          enum: ['heading1', 'heading2', 'heading3', 'body', 'caption', 'label'] 
        },
        color: { type: 'string', required: false },
        align: { 
          type: 'enum', 
          required: false, 
          enum: ['left', 'center', 'right', 'justify'] 
        },
      },
      platforms: ['web', 'ios', 'android'],
      renderer: 'TextRenderer',
    });
  }

  private registerImageComponent(): void {
    this.register({
      type: 'Image',
      version: '1.0.0',
      displayName: 'Image',
      description: 'Image display component',
      category: 'display',
      tags: ['image', 'media'],
      propsSchema: {
        src: { type: 'string', required: true },
        alt: { type: 'string', required: true },
        width: { type: 'number', required: false },
        height: { type: 'number', required: false },
        fit: { 
          type: 'enum', 
          required: false, 
          enum: ['cover', 'contain', 'fill', 'none'] 
        },
        rounded: { type: 'boolean', required: false },
      },
      platforms: ['web', 'ios', 'android'],
      renderer: 'ImageRenderer',
    });
  }

  private registerIconComponent(): void {
    this.register({
      type: 'Icon',
      version: '1.0.0',
      displayName: 'Icon',
      description: 'Icon display component',
      category: 'display',
      tags: ['icon', 'media'],
      propsSchema: {
        name: { type: 'string', required: true },
        size: { type: 'number', required: false },
        color: { type: 'string', required: false },
      },
      platforms: ['web', 'ios', 'android'],
      renderer: 'IconRenderer',
    });
  }

  private registerBadgeComponent(): void {
    this.register({
      type: 'Badge',
      version: '1.0.0',
      displayName: 'Badge',
      description: 'Badge/count indicator',
      category: 'display',
      tags: ['badge', 'indicator'],
      propsSchema: {
        label: { type: 'string', required: true },
        variant: { 
          type: 'enum', 
          required: false, 
          enum: ['primary', 'secondary', 'success', 'warning', 'danger'] 
        },
        size: { 
          type: 'enum', 
          required: false, 
          enum: ['sm', 'md', 'lg'] 
        },
        dot: { type: 'boolean', required: false },
      },
      platforms: ['web', 'ios', 'android'],
      renderer: 'BadgeRenderer',
    });
  }

  private registerAvatarComponent(): void {
    this.register({
      type: 'Avatar',
      version: '1.0.0',
      displayName: 'Avatar',
      description: 'User avatar component',
      category: 'display',
      tags: ['avatar', 'user'],
      propsSchema: {
        src: { type: 'string', required: false },
        name: { type: 'string', required: false },
        size: { type: 'number', required: false },
        rounded: { type: 'boolean', required: false },
      },
      platforms: ['web', 'ios', 'android'],
      renderer: 'AvatarRenderer',
    });
  }

  private registerCardComponent(): void {
    this.register({
      type: 'Card',
      version: '1.0.0',
      displayName: 'Card',
      description: 'Card container component',
      category: 'composite',
      tags: ['card', 'container'],
      slots: {
        header: { name: 'header', description: 'Card header', multiple: false },
        body: { name: 'body', description: 'Card body', multiple: false, required: true },
        footer: { name: 'footer', description: 'Card footer', multiple: false },
      },
      propsSchema: {
        title: { type: 'string', required: false },
        subtitle: { type: 'string', required: false },
        elevation: { type: 'number', required: false },
        padding: { type: 'string', required: false },
        clickable: { type: 'boolean', required: false },
      },
      events: [
        { name: 'click', description: 'Card clicked', bubbles: true },
      ],
      platforms: ['web', 'ios', 'android'],
      renderer: 'CardRenderer',
    });
  }

  private registerDividerComponent(): void {
    this.register({
      type: 'Divider',
      version: '1.0.0',
      displayName: 'Divider',
      description: 'Horizontal/vertical divider',
      category: 'display',
      tags: ['divider', 'separator'],
      propsSchema: {
        orientation: { 
          type: 'enum', 
          required: false, 
          enum: ['horizontal', 'vertical'] 
        },
        spacing: { type: 'string', required: false },
      },
      platforms: ['web', 'ios', 'android'],
      renderer: 'DividerRenderer',
    });
  }

  private registerButtonComponent(): void {
    this.register({
      type: 'Button',
      version: '1.0.0',
      displayName: 'Button',
      description: 'Interactive button component',
      category: 'interactive',
      tags: ['button', 'action'],
      requiredCapabilities: [],
      propsSchema: {
        label: { type: 'string', required: true },
        variant: { 
          type: 'enum', 
          required: false, 
          enum: ['primary', 'secondary', 'danger', 'link', 'ghost'] 
        },
        size: { 
          type: 'enum', 
          required: false, 
          enum: ['sm', 'md', 'lg'] 
        },
        icon: { type: 'string', required: false },
        iconPosition: { 
          type: 'enum', 
          required: false, 
          enum: ['left', 'right'] 
        },
        fullWidth: { type: 'boolean', required: false },
        loading: { type: 'boolean', required: false },
      },
      events: [
        { name: 'click', description: 'Button clicked', bubbles: true },
      ],
      platforms: ['web', 'ios', 'android'],
      renderer: 'ButtonRenderer',
      lifecycle: {
        mounted: undefined,
        unmounted: undefined,
      },
    });
  }

  private registerLinkComponent(): void {
    this.register({
      type: 'Link',
      version: '1.0.0',
      displayName: 'Link',
      description: 'Hyperlink component',
      category: 'interactive',
      tags: ['link', 'navigation'],
      propsSchema: {
        href: { type: 'string', required: true },
        label: { type: 'string', required: false },
        variant: { 
          type: 'enum', 
          required: false, 
          enum: ['default', 'primary', 'secondary'] 
        },
        external: { type: 'boolean', required: false },
      },
      events: [
        { name: 'click', description: 'Link clicked', bubbles: true },
      ],
      platforms: ['web', 'ios', 'android'],
      renderer: 'LinkRenderer',
    });
  }

  private registerToggleComponent(): void {
    this.register({
      type: 'Toggle',
      version: '1.0.0',
      displayName: 'Toggle',
      description: 'Toggle switch component',
      category: 'interactive',
      tags: ['toggle', 'switch', 'boolean'],
      propsSchema: {
        value: { type: 'boolean', required: true },
        label: { type: 'string', required: false },
        disabled: { type: 'boolean', required: false },
      },
      events: [
        { name: 'change', description: 'Toggle changed', bubbles: true },
      ],
      platforms: ['web', 'ios', 'android'],
      renderer: 'ToggleRenderer',
    });
  }

  private registerSliderComponent(): void {
    this.register({
      type: 'Slider',
      version: '1.0.0',
      displayName: 'Slider',
      description: 'Slider input component',
      category: 'interactive',
      tags: ['slider', 'range', 'number'],
      propsSchema: {
        value: { type: 'number', required: true },
        min: { type: 'number', required: false },
        max: { type: 'number', required: false },
        step: { type: 'number', required: false },
        label: { type: 'string', required: false },
        disabled: { type: 'boolean', required: false },
      },
      events: [
        { name: 'change', description: 'Slider value changed', bubbles: true },
        { name: 'dragEnd', description: 'Drag ended', bubbles: true },
      ],
      platforms: ['web', 'ios', 'android'],
      renderer: 'SliderRenderer',
    });
  }

  private registerInputComponent(): void {
    this.register({
      type: 'Input',
      version: '1.0.0',
      displayName: 'Input',
      description: 'Text input component',
      category: 'form',
      tags: ['input', 'text', 'form'],
      propsSchema: {
        value: { type: 'string', required: false },
        label: { type: 'string', required: false },
        placeholder: { type: 'string', required: false },
        type: { 
          type: 'enum', 
          required: false, 
          enum: ['text', 'email', 'password', 'number', 'tel', 'search'] 
        },
        disabled: { type: 'boolean', required: false },
        error: { type: 'string', required: false },
        helperText: { type: 'string', required: false },
        required: { type: 'boolean', required: false },
        prefix: { type: 'string', required: false },
        suffix: { type: 'string', required: false },
      },
      events: [
        { name: 'change', description: 'Input value changed', bubbles: true },
        { name: 'blur', description: 'Input lost focus', bubbles: true },
        { name: 'focus', description: 'Input gained focus', bubbles: true },
      ],
      platforms: ['web', 'ios', 'android'],
      renderer: 'InputRenderer',
    });
  }

  private registerSelectComponent(): void {
    this.register({
      type: 'Select',
      version: '1.0.0',
      displayName: 'Select',
      description: 'Select dropdown component',
      category: 'form',
      tags: ['select', 'dropdown', 'form'],
      propsSchema: {
        value: { type: 'string', required: false },
        options: { 
          type: 'array', 
          required: true,
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              value: { type: 'string' },
              disabled: { type: 'boolean' },
            },
          },
        },
        label: { type: 'string', required: false },
        placeholder: { type: 'string', required: false },
        disabled: { type: 'boolean', required: false },
        error: { type: 'string', required: false },
        multiple: { type: 'boolean', required: false },
        searchable: { type: 'boolean', required: false },
      },
      events: [
        { name: 'change', description: 'Selection changed', bubbles: true },
      ],
      platforms: ['web', 'ios', 'android'],
      renderer: 'SelectRenderer',
    });
  }

  private registerCheckboxComponent(): void {
    this.register({
      type: 'Checkbox',
      version: '1.0.0',
      displayName: 'Checkbox',
      description: 'Checkbox component',
      category: 'form',
      tags: ['checkbox', 'boolean', 'form'],
      propsSchema: {
        value: { type: 'boolean', required: true },
        label: { type: 'string', required: false },
        disabled: { type: 'boolean', required: false },
        indeterminate: { type: 'boolean', required: false },
      },
      events: [
        { name: 'change', description: 'Checkbox changed', bubbles: true },
      ],
      platforms: ['web', 'ios', 'android'],
      renderer: 'CheckboxRenderer',
    });
  }

  private registerRadioComponent(): void {
    this.register({
      type: 'Radio',
      version: '1.0.0',
      displayName: 'Radio',
      description: 'Radio button component',
      category: 'form',
      tags: ['radio', 'selection', 'form'],
      propsSchema: {
        value: { type: 'string', required: true },
        groupValue: { type: 'string', required: false },
        label: { type: 'string', required: false },
        disabled: { type: 'boolean', required: false },
      },
      events: [
        { name: 'change', description: 'Radio selected', bubbles: true },
      ],
      platforms: ['web', 'ios', 'android'],
      renderer: 'RadioRenderer',
    });
  }

  private registerTextAreaComponent(): void {
    this.register({
      type: 'TextArea',
      version: '1.0.0',
      displayName: 'TextArea',
      description: 'Multi-line text input',
      category: 'form',
      tags: ['textarea', 'text', 'form'],
      propsSchema: {
        value: { type: 'string', required: false },
        label: { type: 'string', required: false },
        placeholder: { type: 'string', required: false },
        rows: { type: 'number', required: false },
        maxLength: { type: 'number', required: false },
        disabled: { type: 'boolean', required: false },
        error: { type: 'string', required: false },
        autoResize: { type: 'boolean', required: false },
      },
      events: [
        { name: 'change', description: 'Text changed', bubbles: true },
      ],
      platforms: ['web', 'ios', 'android'],
      renderer: 'TextAreaRenderer',
    });
  }

  private registerDatePickerComponent(): void {
    this.register({
      type: 'DatePicker',
      version: '1.0.0',
      displayName: 'DatePicker',
      description: 'Date/time picker component',
      category: 'form',
      tags: ['date', 'time', 'picker', 'form'],
      propsSchema: {
        value: { type: 'string', required: false },
        label: { type: 'string', required: false },
        mode: { 
          type: 'enum', 
          required: false, 
          enum: ['date', 'time', 'datetime'] 
        },
        minDate: { type: 'string', required: false },
        maxDate: { type: 'string', required: false },
        disabled: { type: 'boolean', required: false },
        error: { type: 'string', required: false },
      },
      events: [
        { name: 'change', description: 'Date selected', bubbles: true },
      ],
      platforms: ['web', 'ios', 'android'],
      renderer: 'DatePickerRenderer',
    });
  }

  private registerFileUploadComponent(): void {
    this.register({
      type: 'FileUpload',
      version: '1.0.0',
      displayName: 'FileUpload',
      description: 'File upload component',
      category: 'form',
      tags: ['file', 'upload', 'form'],
      propsSchema: {
        value: { type: 'array', required: false },
        label: { type: 'string', required: false },
        accept: { type: 'string', required: false },
        maxSize: { type: 'number', required: false },
        maxFiles: { type: 'number', required: false },
        multiple: { type: 'boolean', required: false },
        disabled: { type: 'boolean', required: false },
      },
      events: [
        { name: 'change', description: 'Files selected', bubbles: true },
        { name: 'upload', description: 'Upload completed', bubbles: true },
        { name: 'error', description: 'Upload error', bubbles: true },
      ],
      platforms: ['web', 'ios', 'android'],
      renderer: 'FileUploadRenderer',
    });
  }

  private registerTableComponent(): void {
    this.register({
      type: 'Table',
      version: '1.0.0',
      displayName: 'Table',
      description: 'Data table component',
      category: 'data',
      tags: ['table', 'data', 'grid'],
      propsSchema: {
        columns: { 
          type: 'array', 
          required: true,
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              label: { type: 'string' },
              width: { type: 'number' },
              sortable: { type: 'boolean' },
              filterable: { type: 'boolean' },
            },
          },
        },
        data: { type: 'array', required: true },
        loading: { type: 'boolean', required: false },
        pagination: { type: 'object', required: false },
        selectable: { type: 'boolean', required: false },
      },
      events: [
        { name: 'rowClick', description: 'Row clicked', bubbles: true },
        { name: 'sort', description: 'Sort changed', bubbles: true },
        { name: 'pageChange', description: 'Page changed', bubbles: true },
      ],
      platforms: ['web'],
      renderer: 'TableRenderer',
    });
  }

  private registerListComponent(): void {
    this.register({
      type: 'List',
      version: '1.0.0',
      displayName: 'List',
      description: 'List component',
      category: 'data',
      tags: ['list', 'data', 'items'],
      propsSchema: {
        items: { type: 'array', required: true },
        itemTemplate: { type: 'string', required: false },
        loading: { type: 'boolean', required: false },
        emptyText: { type: 'string', required: false },
        virtualized: { type: 'boolean', required: false },
      },
      events: [
        { name: 'itemClick', description: 'Item clicked', bubbles: true },
      ],
      platforms: ['web', 'ios', 'android'],
      renderer: 'ListRenderer',
    });
  }

  private registerTreeComponent(): void {
    this.register({
      type: 'Tree',
      version: '1.0.0',
      displayName: 'Tree',
      description: 'Tree/hierarchical data component',
      category: 'data',
      tags: ['tree', 'hierarchy', 'nested'],
      propsSchema: {
        data: { type: 'array', required: true },
        labelField: { type: 'string', required: false },
        childrenField: { type: 'string', required: false },
        expanded: { type: 'array', required: false },
        selectable: { type: 'boolean', required: false },
      },
      events: [
        { name: 'nodeClick', description: 'Node clicked', bubbles: true },
        { name: 'expand', description: 'Node expanded', bubbles: true },
        { name: 'collapse', description: 'Node collapsed', bubbles: true },
      ],
      platforms: ['web'],
      renderer: 'TreeRenderer',
    });
  }

  private registerGridComponent(): void {
    this.register({
      type: 'Grid',
      version: '1.0.0',
      displayName: 'Grid',
      description: 'Grid layout container',
      category: 'container',
      tags: ['grid', 'layout', 'container'],
      slots: {
        default: { name: 'default', description: 'Grid content', multiple: true },
      },
      propsSchema: {
        columns: { type: 'number', required: false },
        gap: { type: 'string', required: false },
      },
      platforms: ['web', 'ios', 'android'],
      renderer: 'GridRenderer',
    });
  }

  private registerFlexComponent(): void {
    this.register({
      type: 'Flex',
      version: '1.0.0',
      displayName: 'Flex',
      description: 'Flex layout container',
      category: 'container',
      tags: ['flex', 'layout', 'container'],
      slots: {
        default: { name: 'default', description: 'Flex content', multiple: true },
      },
      propsSchema: {
        direction: { 
          type: 'enum', 
          required: false, 
          enum: ['row', 'column', 'row-reverse', 'column-reverse'] 
        },
        justify: { 
          type: 'enum', 
          required: false, 
          enum: ['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly'] 
        },
        align: { 
          type: 'enum', 
          required: false, 
          enum: ['start', 'center', 'end', 'stretch', 'baseline'] 
        },
        gap: { type: 'string', required: false },
        wrap: { 
          type: 'enum', 
          required: false, 
          enum: ['nowrap', 'wrap', 'wrap-reverse'] 
        },
      },
      platforms: ['web', 'ios', 'android'],
      renderer: 'FlexRenderer',
    });
  }

  private registerStackComponent(): void {
    this.register({
      type: 'Stack',
      version: '1.0.0',
      displayName: 'Stack',
      description: 'Stack layout container',
      category: 'container',
      tags: ['stack', 'layout', 'container'],
      slots: {
        default: { name: 'default', description: 'Stack content', multiple: true },
      },
      propsSchema: {
        direction: { 
          type: 'enum', 
          required: false, 
          enum: ['vertical', 'horizontal'] 
        },
        gap: { type: 'string', required: false },
        align: { 
          type: 'enum', 
          required: false, 
          enum: ['start', 'center', 'end', 'stretch', 'space-between', 'space-around'] 
        },
      },
      platforms: ['web', 'ios', 'android'],
      renderer: 'StackRenderer',
    });
  }

  private registerTabsComponent(): void {
    this.register({
      type: 'Tabs',
      version: '1.0.0',
      displayName: 'Tabs',
      description: 'Tabbed layout container',
      category: 'container',
      tags: ['tabs', 'layout', 'container'],
      propsSchema: {
        tabs: { 
          type: 'array', 
          required: true,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              icon: { type: 'string' },
            },
          },
        },
        activeTab: { type: 'string', required: false },
        position: { 
          type: 'enum', 
          required: false, 
          enum: ['top', 'bottom', 'left', 'right'] 
        },
        variant: { 
          type: 'enum', 
          required: false, 
          enum: ['line', 'pills', 'enclosed'] 
        },
      },
      events: [
        { name: 'tabChange', description: 'Tab changed', bubbles: true },
      ],
      platforms: ['web', 'ios', 'android'],
      renderer: 'TabsRenderer',
    });
  }

  private registerModalComponent(): void {
    this.register({
      type: 'Modal',
      version: '1.0.0',
      displayName: 'Modal',
      description: 'Modal dialog',
      category: 'container',
      tags: ['modal', 'dialog', 'overlay'],
      slots: {
        header: { name: 'header', description: 'Modal header', multiple: false },
        body: { name: 'body', description: 'Modal body', multiple: false, required: true },
        footer: { name: 'footer', description: 'Modal footer', multiple: false },
      },
      propsSchema: {
        open: { type: 'boolean', required: true },
        title: { type: 'string', required: false },
        size: { 
          type: 'enum', 
          required: false, 
          enum: ['sm', 'md', 'lg', 'xl', 'full'] 
        },
        closable: { type: 'boolean', required: false },
        closeOnOverlayClick: { type: 'boolean', required: false },
        closeOnEscape: { type: 'boolean', required: false },
      },
      events: [
        { name: 'close', description: 'Modal closed', bubbles: true },
      ],
      platforms: ['web', 'ios', 'android'],
      renderer: 'ModalRenderer',
    });
  }

  private registerDrawerComponent(): void {
    this.register({
      type: 'Drawer',
      version: '1.0.0',
      displayName: 'Drawer',
      description: 'Drawer/side panel',
      category: 'container',
      tags: ['drawer', 'panel', 'overlay', 'sidebar'],
      slots: {
        header: { name: 'header', description: 'Drawer header', multiple: false },
        body: { name: 'body', description: 'Drawer body', multiple: false, required: true },
        footer: { name: 'footer', description: 'Drawer footer', multiple: false },
      },
      propsSchema: {
        open: { type: 'boolean', required: true },
        title: { type: 'string', required: false },
        placement: { 
          type: 'enum', 
          required: false, 
          enum: ['start', 'end', 'top', 'bottom'] 
        },
        size: { type: 'string', required: false },
        closable: { type: 'boolean', required: false },
        closeOnOverlayClick: { type: 'boolean', required: false },
      },
      events: [
        { name: 'close', description: 'Drawer closed', bubbles: true },
      ],
      platforms: ['web', 'ios', 'android'],
      renderer: 'DrawerRenderer',
    });
  }
}
