# Frontend Validation Integration Guide (Lithuanian)

This guide explains how to integrate with the enhanced validation system for optimal user experience. All error messages are in Lithuanian.

## Enhanced Error Response Format

The API now returns validation errors in Lithuanian:

```json
{
  "success": false,
  "message": "Rasta 2 validacijos klaidų 2 laukuose",
  "errors": {
    "email": "Įveskite teisingą el. pašto adresą",
    "password": "Slaptažodis turi būti bent 8 simbolių ilgio"
  },
  "validation": {
    "hasErrors": true,
    "fieldErrors": {
      "email": [
        {
          "code": "format",
          "message": "Įveskite teisingą el. pašto adresą",
          "value": "invalid-email",
          "constraint": { "format": "email" }
        }
      ],
      "password": [
        {
          "code": "minLength",
          "message": "Slaptažodis turi būti bent 8 simbolių ilgio",
          "value": "123",
          "constraint": { "minLength": 8 }
        }
      ]
    },
    "summary": [
      {
        "field": "email",
        "message": "Įveskite teisingą el. pašto adresą",
        "code": "format"
      },
      {
        "field": "password",
        "message": "Slaptažodis turi būti bent 8 simbolių ilgio",
        "code": "minLength"
      }
    ],
    "errorCount": 2
  }
}
```

## Available Schemas for Validation

The following schemas are automatically registered and available for validation:

- `register` - User registration form
- `login` - User login form  
- `refreshToken` - Token refresh
- `updateUserProfile` - User profile update
- `createVote` - Vote creation
- `createServer` - Server creation
- `updateConfig` - Configuration update
- `createVotifier` - Votifier setup
- `adminAction` - Admin actions

## Real-time Field Validation

### Single Field Validation

Validate individual fields as users type:

```javascript
async function validateField(schema, field, value) {
  try {
    const response = await fetch('/api/validate/field', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schema, field, value })
    });
    
    const result = await response.json();
    return {
      valid: result.valid,
      errors: result.errors || [],
      message: result.message
    };
  } catch (error) {
    return { valid: false, errors: ['Validacijos paslauga nepasiekiama'] };
  }
}

// Usage example
const emailValidation = await validateField('register', 'email', 'user@example.com');
if (!emailValidation.valid) {
  showFieldError('email', emailValidation.errors[0].message);
}
```

### Multiple Fields Validation

Validate multiple fields at once:

```javascript
async function validateFields(schema, fields) {
  try {
    const response = await fetch('/api/validate/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schema, fields })
    });
    
    const result = await response.json();
    return result.results;
  } catch (error) {
    return {};
  }
}

// Usage example
const formData = {
  email: 'user@example.com',
  password: '12345'
};

const validationResults = await validateFields('register', formData);
Object.keys(validationResults).forEach(field => {
  const fieldResult = validationResults[field];
  if (!fieldResult.valid) {
    showFieldError(field, fieldResult.errors[0].message);
  } else {
    clearFieldError(field);
  }
});
```

## Lithuanian Error Messages Reference

Common validation error messages in Lithuanian:

### Field Names
- `email` → "El. paštas"
- `password` → "Slaptažodis"  
- `name` → "Vardas"
- `username` → "Vartotojo vardas"
- `phone` → "Telefono numeris"
- `address` → "Adresas"
- `description` → "Aprašymas"
- `recaptcha_token` → "reCAPTCHA žetonas"

### Error Types
- `required` → "yra privalomas"
- `format` → "formatas neteisingas"
- `minLength` → "turi būti bent X simbolių"
- `maxLength` → "negali viršyti X simbolių"
- `minimum` → "turi būti bent X"
- `maximum` → "negali viršyti X"
- `pattern` → "formatas neteisingas"
- `enum` → "turi būti vienas iš: ..."
- `type` → "turi būti [tekstas/skaičius/...]"

### Common Messages
- "Šis laukas yra privalomas" - This field is required
- "Įveskite teisingą el. pašto adresą" - Enter a valid email address
- "Slaptažodis turi būti bent 8 simbolių ilgio" - Password must be at least 8 characters
- "Vartotojo vardas per ilgas" - Username is too long
- "Neteisingas formatas" - Invalid format
- "Validacijos klaidų nėra" - No validation errors
- "Rasta X validacijos klaidų Y laukuose" - Found X validation errors in Y fields

## Frontend Validation Helper Class (Updated)

```javascript
class ValidationHelper {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.constraints = new Map();
    
    // Lithuanian error messages for client-side validation
    this.messages = {
      required: 'Šis laukas yra privalomas',
      email: 'Įveskite teisingą el. pašto adresą',
      minLength: (min) => `Turi būti bent ${min} simbolių`,
      maxLength: (max) => `Negali viršyti ${max} simbolių`,
      min: (min) => `Turi būti bent ${min}`,
      max: (max) => `Negali viršyti ${max}`,
      pattern: 'Neteisingas formatas',
      type: 'Neteisingas duomenų tipas',
      service_error: 'Validacijos paslauga nepasiekiama'
    };
  }

  // Client-side validation with Lithuanian messages
  validateFieldLocally(schema, field, value) {
    const constraints = this.constraints.get(schema);
    if (!constraints || !constraints[field]) {
      return { valid: true, errors: [] };
    }

    const fieldConstraints = constraints[field];
    const errors = [];

    // Required validation
    if (fieldConstraints.required && (!value || value.toString().trim() === '')) {
      errors.push({ message: this.messages.required, code: 'required' });
      return { valid: false, errors };
    }

    // Skip other validations if field is empty and not required
    if (!value || value.toString().trim() === '') {
      return { valid: true, errors: [] };
    }

    // Type validation
    if (fieldConstraints.type === 'string' && typeof value !== 'string') {
      errors.push({ message: 'Reikšmė turi būti tekstas', code: 'type' });
    }

    if (fieldConstraints.type === 'number' && typeof value !== 'number') {
      errors.push({ message: 'Reikšmė turi būti skaičius', code: 'type' });
    }

    // Length validation for strings
    if (typeof value === 'string') {
      if (fieldConstraints.minLength && value.length < fieldConstraints.minLength) {
        errors.push({ 
          message: this.messages.minLength(fieldConstraints.minLength), 
          code: 'minLength' 
        });
      }

      if (fieldConstraints.maxLength && value.length > fieldConstraints.maxLength) {
        errors.push({ 
          message: this.messages.maxLength(fieldConstraints.maxLength), 
          code: 'maxLength' 
        });
      }

      // Email format validation
      if (fieldConstraints.format === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push({ message: this.messages.email, code: 'format' });
        }
      }

      // Pattern validation
      if (fieldConstraints.pattern) {
        const regex = new RegExp(fieldConstraints.pattern);
        if (!regex.test(value)) {
          errors.push({ message: this.messages.pattern, code: 'pattern' });
        }
      }
    }

    // Number validation
    if (typeof value === 'number') {
      if (fieldConstraints.min !== undefined && value < fieldConstraints.min) {
        errors.push({ 
          message: this.messages.min(fieldConstraints.min), 
          code: 'minimum' 
        });
      }

      if (fieldConstraints.max !== undefined && value > fieldConstraints.max) {
        errors.push({ 
          message: this.messages.max(fieldConstraints.max), 
          code: 'maximum' 
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Create field validator with Lithuanian messages
  createFieldValidator(schema, field, inputElement, errorElement) {
    let timeoutId;
    
    const validator = async (value) => {
      clearTimeout(timeoutId);
      
      // Clear previous errors
      errorElement.textContent = '';
      inputElement.classList.remove('error', 'valid');
      
      // Skip validation for empty non-required fields
      if (!value || value.trim() === '') {
        const constraints = this.constraints.get(schema);
        const fieldConstraints = constraints?.[field];
        if (!fieldConstraints?.required) {
          return;
        }
      }
      
      // Local validation first
      const localResult = this.validateFieldLocally(schema, field, value);
      if (!localResult.valid) {
        inputElement.classList.add('error');
        errorElement.textContent = localResult.errors[0].message;
        return;
      }
      
      // Server validation after delay
      timeoutId = setTimeout(async () => {
        try {
          const serverResult = await this.validateField(schema, field, value);
          if (serverResult.valid) {
            inputElement.classList.add('valid');
          } else {
            inputElement.classList.add('error');
            errorElement.textContent = serverResult.errors?.[0]?.message || 'Validacijos klaida';
          }
        } catch (error) {
          inputElement.classList.add('error');
          errorElement.textContent = this.messages.service_error;
        }
      }, 300);
    };
    
    return validator;
  }
}
```

## Form Integration Example

```html
<form id="registerForm">
  <div class="field">
    <label for="email">El. paštas *</label>
    <input type="email" id="email" name="email" required>
    <span class="error-message" id="email-error"></span>
  </div>
  
  <div class="field">
    <label for="password">Slaptažodis *</label>
    <input type="password" id="password" name="password" required>
    <span class="error-message" id="password-error"></span>
  </div>
  
  <button type="submit">Registruotis</button>
</form>

<script>
const validator = new ValidationHelper();

// Initialize validation
async function initValidation() {
  await validator.loadConstraints('register');
  
  // Set up field validators
  const emailValidator = validator.createFieldValidator(
    'register', 
    'email', 
    document.getElementById('email'),
    document.getElementById('email-error')
  );
  
  const passwordValidator = validator.createFieldValidator(
    'register', 
    'password', 
    document.getElementById('password'),
    document.getElementById('password-error')
  );
  
  // Attach event listeners
  document.getElementById('email').addEventListener('input', (e) => {
    emailValidator(e.target.value);
  });
  
  document.getElementById('password').addEventListener('input', (e) => {
    passwordValidator(e.target.value);
  });
}

// Form submission with validation
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  
  // Validate all fields
  const isValid = await validator.validateForm('register', data);
  
  if (isValid) {
    // Submit form
    console.log('Form is valid, submitting...');
  } else {
    console.log('Form has validation errors');
  }
});

// Initialize when page loads
initValidation();
</script>
```

This enhanced validation system provides:
- **Lithuanian error messages** throughout
- **Real-time validation** as users type
- **Consistent validation** between client and server
- **Better user experience** with immediate feedback
- **Accessibility support** with proper error association
- **Automatic schema registration** for all domains

## Getting Schema Constraints

Fetch validation constraints to set up client-side validation:

```javascript
async function getSchemaConstraints(schema) {
  try {
    const response = await fetch(`/api/validate/schema/${schema}/constraints`);
    const result = await response.json();
    return result.data.constraints;
  } catch (error) {
    return {};
  }
}

// Usage example
const constraints = await getSchemaConstraints('register');
console.log(constraints);
// Output:
// {
//   "email": {
//     "type": "string",
//     "required": false,
//     "maxLength": 100,
//     "format": "email"
//   },
//   "password": {
//     "type": "string",
//     "required": false,
//     "minLength": 8,
//     "maxLength": 128
//   }
// }
```

## Frontend Validation Helper Class

Here's a complete helper class for frontend integration:

```javascript
class ValidationHelper {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.constraints = new Map();
  }

  async loadConstraints(schema) {
    if (this.constraints.has(schema)) {
      return this.constraints.get(schema);
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/validate/schema/${schema}/constraints`);
      const result = await response.json();
      
      if (result.success) {
        this.constraints.set(schema, result.data.constraints);
        return result.data.constraints;
      }
    } catch (error) {
      console.warn('Failed to load validation constraints:', error);
    }
    
    return {};
  }

  async validateField(schema, field, value) {
    try {
      const response = await fetch(`${this.baseUrl}/api/validate/field`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema, field, value })
      });
      
      return await response.json();
    } catch (error) {
      return { 
        success: false, 
        valid: false, 
        errors: [{ message: 'Validation service unavailable', code: 'service_error' }] 
      };
    }
  }

  async validateForm(schema, formData) {
    try {
      const response = await fetch(`${this.baseUrl}/api/validate/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema, fields: formData })
      });
      
      return await response.json();
    } catch (error) {
      return { 
        success: false, 
        valid: false, 
        results: {} 
      };
    }
  }

  // Client-side validation using loaded constraints
  validateFieldLocally(schema, field, value) {
    const constraints = this.constraints.get(schema);
    if (!constraints || !constraints[field]) {
      return { valid: true, errors: [] };
    }

    const fieldConstraints = constraints[field];
    const errors = [];

    // Type validation
    if (fieldConstraints.type === 'string' && typeof value !== 'string') {
      errors.push({ message: 'Must be text', code: 'type' });
    }

    if (fieldConstraints.type === 'number' && typeof value !== 'number') {
      errors.push({ message: 'Must be a number', code: 'type' });
    }

    // Length validation for strings
    if (typeof value === 'string') {
      if (fieldConstraints.minLength && value.length < fieldConstraints.minLength) {
        errors.push({ 
          message: `Must be at least ${fieldConstraints.minLength} characters`, 
          code: 'minLength' 
        });
      }

      if (fieldConstraints.maxLength && value.length > fieldConstraints.maxLength) {
        errors.push({ 
          message: `Must not exceed ${fieldConstraints.maxLength} characters`, 
          code: 'maxLength' 
        });
      }

      // Pattern validation
      if (fieldConstraints.pattern) {
        const regex = new RegExp(fieldConstraints.pattern);
        if (!regex.test(value)) {
          errors.push({ message: 'Invalid format', code: 'pattern' });
        }
      }

      // Email format validation
      if (fieldConstraints.format === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push({ message: 'Please enter a valid email address', code: 'format' });
        }
      }
    }

    // Number validation
    if (typeof value === 'number') {
      if (fieldConstraints.min !== undefined && value < fieldConstraints.min) {
        errors.push({ 
          message: `Must be at least ${fieldConstraints.min}`, 
          code: 'minimum' 
        });
      }

      if (fieldConstraints.max !== undefined && value > fieldConstraints.max) {
        errors.push({ 
          message: `Must not exceed ${fieldConstraints.max}`, 
          code: 'maximum' 
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Debounced validation for real-time feedback
  createDebouncedValidator(schema, field, callback, delay = 300) {
    let timeoutId;
    
    return (value) => {
      clearTimeout(timeoutId);
      
      // First, do local validation for immediate feedback
      const localResult = this.validateFieldLocally(schema, field, value);
      if (!localResult.valid) {
        callback(localResult);
        return;
      }

      // Then do server validation after delay
      timeoutId = setTimeout(async () => {
        const serverResult = await this.validateField(schema, field, value);
        callback(serverResult);
      }, delay);
    };
  }
}

// Usage example
const validator = new ValidationHelper();

// Load constraints on page load
await validator.loadConstraints('register');

// Set up real-time validation
const emailValidator = validator.createDebouncedValidator('register', 'email', (result) => {
  const emailField = document.getElementById('email');
  const errorElement = document.getElementById('email-error');
  
  if (result.valid) {
    emailField.classList.remove('error');
    errorElement.textContent = '';
  } else {
    emailField.classList.add('error');
    errorElement.textContent = result.errors[0]?.message || 'Invalid email';
  }
});

// Attach to input event
document.getElementById('email').addEventListener('input', (e) => {
  emailValidator(e.target.value);
});
```

## Form Integration Examples

### React Hook Example

```javascript
import { useState, useEffect, useCallback } from 'react';

function useValidation(schema) {
  const [validator] = useState(() => new ValidationHelper());
  const [constraints, setConstraints] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    validator.loadConstraints(schema).then(setConstraints);
  }, [schema, validator]);

  const validateField = useCallback(async (field, value) => {
    const result = await validator.validateField(schema, field, value);
    
    setErrors(prev => ({
      ...prev,
      [field]: result.valid ? [] : result.errors
    }));

    return result.valid;
  }, [schema, validator]);

  const validateForm = useCallback(async (formData) => {
    const result = await validator.validateForm(schema, formData);
    
    const newErrors = {};
    Object.keys(result.results || {}).forEach(field => {
      const fieldResult = result.results[field];
      newErrors[field] = fieldResult.valid ? [] : fieldResult.errors;
    });
    
    setErrors(newErrors);
    return result.valid;
  }, [schema, validator]);

  return {
    constraints,
    errors,
    validateField,
    validateForm,
    hasErrors: Object.values(errors).some(fieldErrors => fieldErrors.length > 0)
  };
}
```

### Vue.js Composition API Example

```javascript
import { ref, reactive, onMounted } from 'vue';

export function useValidation(schema) {
  const validator = new ValidationHelper();
  const constraints = ref({});
  const errors = reactive({});

  onMounted(async () => {
    constraints.value = await validator.loadConstraints(schema);
  });

  const validateField = async (field, value) => {
    const result = await validator.validateField(schema, field, value);
    errors[field] = result.valid ? [] : result.errors;
    return result.valid;
  };

  const validateForm = async (formData) => {
    const result = await validator.validateForm(schema, formData);
    
    Object.keys(result.results || {}).forEach(field => {
      const fieldResult = result.results[field];
      errors[field] = fieldResult.valid ? [] : fieldResult.errors;
    });
    
    return result.valid;
  };

  return {
    constraints,
    errors,
    validateField,
    validateForm
  };
}
```

## Best Practices

1. **Progressive Enhancement**: Start with client-side validation for immediate feedback, then validate on the server
2. **Debouncing**: Use debounced validation to avoid excessive API calls
3. **Error Display**: Show field-specific errors near the input fields
4. **Loading States**: Show loading indicators during validation
5. **Accessibility**: Ensure error messages are accessible to screen readers
6. **Caching**: Cache validation constraints to reduce API calls
7. **Fallback**: Always have fallback validation in case the service is unavailable

## Error Codes Reference

Common validation error codes returned by the API:

- `required`: Field is required but missing
- `format`: Field format is invalid (e.g., email, date)
- `minLength`: String is too short
- `maxLength`: String is too long
- `minimum`: Number is too small
- `maximum`: Number is too large
- `pattern`: String doesn't match required pattern
- `enum`: Value is not in allowed list
- `type`: Value is wrong type
- `additionalProperties`: Extra fields not allowed

Each error includes the constraint information to help with client-side validation setup.
