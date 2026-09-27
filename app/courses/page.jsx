'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCourses, getTracks } from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import CourseCard from '../../components/CourseCard';
import Input, { Select } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';

const LEVELS = [
  { value: '', label: 'All levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

function SkeletonGrid() {
  return (
    <div className="grid grid-cards" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <div key={n} className="card skeleton-card">
          <span className="skeleton skeleton-badge" />
          <span className="skeleton skeleton-title" />
          <span className="skeleton skeleton-line" />
          <span className="skeleton skeleton-line skeleton-line-short" />
          <span className="skeleton skeleton-footer" />
        </div>
      ))}
    </div>
  );
}

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [track, setTrack] = useState('');
  const [level, setLevel] = useState('');

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadTracks = useCallback(async () => {
    try {
      const data = await getTracks();
      if (!mountedRef.current) return;
      setTracks(Array.isArray(data) ? data : data?.tracks || []);
    } catch (err) {
      // Track filter is optional — the catalogue still works without it.
      if (mountedRef.current) setTracks([]);
    }
  }, []);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (debouncedSearch) filters.q = debouncedSearch;
      if (track) filters.track = track;
      if (level) filters.level = level;
      const data = await getCourses(filters);
      if (!mountedRef.current) return;
      const list = Array.isArray(data) ? data : data?.courses || [];
      setCourses(list);
    } catch (err) {
      if (!mountedRef.current) return;
      setCourses([]);
      setError(
        err && err.message
          ? err.message
          : 'We could not reach the training catalogue.'
      );
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [debouncedSearch, track, level]);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const hasFilters = useMemo(
    () => Boolean(search || track || level),
    [search, track, level]
  );

  function resetFilters() {
    setSearch('');
    setDebouncedSearch('');
    setTrack('');
    setLevel('');
  }

  return (
    <section className="page-section">
      <PageHeader
        eyebrow="Catalogue"
        title="DevOps courses built by practising engineers"
        description="Hands-on tracks covering pipelines, Kubernetes operations, infrastructure as code and production reliability. Every module ends with a lab and a short knowledge check."
        actions={
          hasFilters ? (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          ) : null
        }
      />

      <div className="toolbar" role="search">
        <div className="toolbar-field toolbar-field-grow">
          <Input
            id="course-search"
            label="Search courses"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Try &quot;GitOps&quot;, &quot;Terraform&quot; or &quot;SLO&quot;"
            hint="Searches titles, summaries and tooling."
          />
        </div>

        <div className="toolbar-field">
          <Select
            id="course-track"
            label="Track"
            value={track}
            onChange={(e) => setTrack(e.target.value)}
          >
            <option value="">All tracks</option>
            {tracks.map((t) => (
              <option key={t.slug || t.id} value={t.slug || t.id}>
                {t.title}
              </option>
            ))}
          </Select>
        </div>

        <div className="toolbar-field">
          <Select
            id="course-level"
            label="Level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            {LEVELS.map((l) => (
              <option key={l.value || 'all'} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {!loading && !error ? (
        <div className="cluster result-summary">
          <Badge tone="accent" size="sm">
            {courses.length} {courses.length === 1 ? 'course' : 'courses'}
          </Badge>
          {hasFilters ? (
            <span className="text-muted">Filtered catalogue view</span>
          ) : (
            <span className="text-muted">Showing the full catalogue</span>
          )}
        </div>
      ) : null}

      {loading ? <SkeletonGrid /> : null}

      {!loading && error ? (
        <EmptyState
          variant="error"
          title="The catalogue is unavailable"
          description={error}
          action={
            <Button variant="primary" onClick={loadCourses}>
              Retry
            </Button>
          }
        />
      ) : null}

      {!loading && !error && courses.length === 0 ? (
        <EmptyState
          variant="empty"
          title="No courses match those filters"
          description="Nothing in the catalogue lines up with your current search, track and level combination. Reset the filters to see every published course."
          action={
            <Button variant="secondary" onClick={resetFilters}>
              Reset filters
            </Button>
          }
        />
      ) : null}

      {!loading && !error && courses.length > 0 ? (
        <div className="grid grid-cards">
          {courses.map((course) => (
            <CourseCard
              key={course.id || course.slug}
              course={course}
              progress={
                typeof course.progress_percent === 'number'
                  ? course.progress_percent
                  : undefined
              }
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}