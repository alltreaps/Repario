import type { CreateLayout } from '../types/layout'

export const sampleLayouts: CreateLayout[] = [
  {
    name: 'Standard Invoice',
    isDefault: true,
    sections: [
      {
        title: 'Company Information',
        fields: [
          {
            label: 'Company Name',
            type: 'input',
            placeholder: 'Enter company name',
            required: true
          },
          {
            label: 'Company Address',
            type: 'description',
            placeholder: 'Enter company address',
            required: true
          },
          {
            label: 'Phone Number',
            type: 'input',
            placeholder: 'Enter phone number',
            required: false
          }
        ]
      },
      {
        title: 'Client Information',
        fields: [
          {
            label: 'Client Name',
            type: 'input',
            placeholder: 'Enter client name',
            required: true
          },
          {
            label: 'Client Address',
            type: 'description',
            placeholder: 'Enter client address',
            required: true
          },
          {
            label: 'Payment Terms',
            type: 'dropdown',
            placeholder: 'Select payment terms',
            required: true,
            options: [
              { label: 'Net 30', value: 'net30' },
              { label: 'Net 15', value: 'net15' },
              { label: 'Due on Receipt', value: 'due_on_receipt' },
              { label: 'Net 60', value: 'net60' }
            ]
          }
        ]
      },
      {
        title: 'Invoice Details',
        fields: [
          {
            label: 'Invoice Number',
            type: 'input',
            placeholder: 'Enter invoice number',
            required: true
          },
          {
            label: 'Invoice Date',
            type: 'input',
            placeholder: 'Enter invoice date',
            required: true
          },
          {
            label: 'Due Date',
            type: 'input',
            placeholder: 'Enter due date',
            required: true
          }
        ]
      },
      {
        title: 'Additional Options',
        fields: [
          {
            label: 'Additional Services',
            type: 'checkboxes',
            required: false,
            options: [
              { label: 'Rush Processing', value: 'rush' },
              { label: 'Email Delivery', value: 'email' },
              { label: 'Physical Copy', value: 'physical' },
              { label: 'Digital Signature', value: 'signature' }
            ]
          },
          {
            label: 'Notes',
            type: 'description',
            placeholder: 'Additional notes or comments',
            required: false
          }
        ]
      }
    ]
  },
  {
    name: 'Simple Invoice',
    isDefault: false,
    sections: [
      {
        title: 'Basic Information',
        fields: [
          {
            label: 'Company Name',
            type: 'input',
            placeholder: 'Your company name',
            required: true
          },
          {
            label: 'Client Name',
            type: 'input',
            placeholder: 'Client name',
            required: true
          }
        ]
      }
    ]
  }
]
