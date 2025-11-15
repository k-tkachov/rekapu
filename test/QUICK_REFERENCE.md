# Testing Quick Reference Card

## ✅ Real Implementation Testing Checklist

### Before Writing Tests
- [ ] Identify the actual implementation file in `src/`
- [ ] Read and understand the real implementation code
- [ ] Note any surprising behavior or edge cases

### TypeScript Setup (Required for TS Imports)
```javascript
require('ts-node').register({
  project: './tsconfig.json',
  compilerOptions: { module: 'CommonJS' }
});
```

### Import Pattern
```javascript
// ✅ DO: Import real implementation
const { RealFunction } = require('../src/path/to/implementation');

// ❌ DON'T: Create local mock
function fakeFunction() { return mockResult; }
```

### Test Header Template
```javascript
/**
 * [Module] Tests (REAL Implementation)
 * 
 * Tests actual [description] from src/path/to/module
 * 
 * Testing Strategy:
 * - Imports and tests REAL production [module/class/functions]
 * - Validates actual [key behaviors]
 * - All assertions based on actual implementation behavior
 * 
 * This replaces previous [fake implementation description].
 */
```

### Test Pattern
```javascript
test('should [specific behavior]', () => {
  // Use real implementation
  const result = RealImplementation.method(input);
  
  // Assert based on actual behavior (not assumptions)
  assert.strictEqual(result.property, actualExpectedValue);
});
```

## 🚫 Red Flags to Avoid

- Local class/function definitions that reimplement production logic
- Hardcoded expected values without understanding where they come from
- Comments like "simplified", "fake", "mock implementation"
- Tests that would pass with any implementation
- Missing imports from `src/` directory

## 🔄 When You Find Fake Tests

1. **Find** the real implementation in `src/`
2. **Study** the actual code and behavior
3. **Replace** fake imports with real ones
4. **Update** assertions to match reality
5. **Document** the testing strategy in comments

## 📚 Key Documents

- `test/README.md` - Comprehensive testing documentation
- `test/TESTING_GUIDELINES.md` - Detailed guidelines and patterns
- `test/QUICK_REFERENCE.md` - This quick reference (you are here)

---

**Remember**: If you're not testing the real implementation, you're not really testing!
