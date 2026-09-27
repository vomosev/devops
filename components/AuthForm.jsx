'use client';

import { useState } from 'react';
import Link from 'next/link';
import Input from './ui/Input';
import Button from './ui/Button';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function AuthForm({ mode = 'login', onSubmit, submitting = false, error = '' }) {
  const isSignup = mode === 'signup';

  const [values, setValues] = useState({
    name: '',
    job_title: '',
    email: '',
    password: '',
  });
  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  function validate(next) {
    const errs = {};
    if (isSignup) {
      if (!next.name.trim()) {
        errs.name = 'Please tell us your name.';
      } else if (next.name.trim().length < 2) {
        errs.name = 'Name must be at least 2 characters.';
      }
    }
    if (!next.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!EMAIL_RE.test(next.email.trim())) {
      errs.email = 'Enter a valid email address, e.g. sre@example.com.';
    }
    if (!next.password) {
      errs.password = 'Password is required.';
    } else if (isSignup && next.password.length < 8) {
      errs.password = 'Use at least 8 characters.';
    }
    return errs;
  }

  function handleChange(field) {
    return (event) => {
      const next = { ...values, [field]: event.target.value };
      setValues(next);
      if (touched[field] || Object.keys(fieldErrors).length > 0) {
        setFieldErrors(validate(next));
      }
    };
  }

  function handleBlur(field) {
    return () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      setFieldErrors(validate(values));
    };
  }

  function handleSubmit(event) {
    event.preventDefault();
    const errs = validate(values);
    setFieldErrors(errs);
    setTouched({ name: true, job_title: true, email: true, password: true });
    if (Object.keys(errs).length > 0) return;

    const payload = isSignup
      ? {
          name: values.name.trim(),
          job_title: values.job_title.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password,
        }
      : {
          email: values.email.trim().toLowerCase(),
          password: values.password,
        };

    if (typeof onSubmit === 'function') {
      onSubmit(payload);
    }
  }

  return (
    <form className="auth-form stack" onSubmit={handleSubmit} noValidate>
      {error ? (
        <p className="form-error user-text" role="alert">
          {error}
        </p>
      ) : null}

      {isSignup ? (
        <>
          <Input
            id="auth-name"
            label="Full name"
            type="text"
            value={values.name}
            onChange={handleChange('name')}
            onBlur={handleBlur('name')}
            placeholder="Priya Raghavan"
            error={touched.name ? fieldErrors.name : ''}
            required
            disabled={submitting}
          />
          <Input
            id="auth-job-title"
            label="Job title"
            type="text"
            value={values.job_title}
            onChange={handleChange('job_title')}
            onBlur={handleBlur('job_title')}
            placeholder="Platform Engineer"
            hint="Optional — helps us recommend the right tracks."
            disabled={submitting}
          />
        </>
      ) : null}

      <Input
        id="auth-email"
        label="Work email"
        type="email"
        value={values.email}
        onChange={handleChange('email')}
        onBlur={handleBlur('email')}
        placeholder="you@company.com"
        error={touched.email ? fieldErrors.email : ''}
        required
        disabled={submitting}
      />

      <Input
        id="auth-password"
        label="Password"
        type="password"
        value={values.password}
        onChange={handleChange('password')}
        onBlur={handleBlur('password')}
        placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
        hint={isSignup ? 'Minimum 8 characters. Mix letters, numbers and symbols.' : ''}
        error={touched.password ? fieldErrors.password : ''}
        required
        disabled={submitting}
      />

      <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
        {isSignup ? 'Create my account' : 'Log in'}
      </Button>

      <p className="auth-switch">
        {isSignup ? (
          <>
            Already have an account? <Link href="/login">Log in instead</Link>
          </>
        ) : (
          <>
            New to DevOps Academy? <Link href="/signup">Create a free account</Link>
          </>
        )}
      </p>
    </form>
  );
}