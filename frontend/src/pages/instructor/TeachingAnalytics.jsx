import { useCallback, useEffect, useState } from 'react';
import { courseApi } from '../../api/courseApi';
import { statsApi } from '../../api/statsApi';
import CourseStatsPanel from '../../components/stats/CourseStatsPanel';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getApiErrorMessage } from '../../utils/apiError';

export default function TeachingAnalytics() {
	const { user } = useAuth();
	const toast = useToast();
	const [courses, setCourses] = useState([]);
	const [selectedCourseId, setSelectedCourseId] = useState('');
	const [courseStats, setCourseStats] = useState(null);
	const [loading, setLoading] = useState(true);
	const [courseLoading, setCourseLoading] = useState(false);

	const loadCourses = useCallback(async () => {
		setLoading(true);
		try {
			const res = await courseApi.getAll({ size: 1000 });
			const myCourses = (res.data.items || []).filter((course) => course.createdById === user?.id);
			setCourses(myCourses);
			if (myCourses.length > 0) {
				setSelectedCourseId(String(myCourses[0].id));
			} else {
				setSelectedCourseId('');
				setCourseStats(null);
			}
		} catch (error) {
			toast.error(getApiErrorMessage(error, 'Failed to load courses'));
		} finally {
			setLoading(false);
		}
	}, [toast, user?.id]);

	const loadCourseStats = useCallback(async (courseId) => {
		setCourseLoading(true);
		try {
			const [overviewRes, completionRes, submissionRes, scoreRes, attendanceRes] = await Promise.all([
				statsApi.getCourseOverview(courseId),
				statsApi.getCourseCompletion(courseId),
				statsApi.getSubmissionRate(courseId),
				statsApi.getScoreDistribution(courseId),
				statsApi.getAttendance(courseId),
			]);
			setCourseStats({
				overview: overviewRes.data,
				completion: completionRes.data || [],
				submissionRate: submissionRes.data || [],
				scoreDistribution: scoreRes.data || [],
				attendance: attendanceRes.data || [],
			});
		} catch (error) {
			toast.error(getApiErrorMessage(error, 'Failed to load teaching analytics'));
		} finally {
			setCourseLoading(false);
		}
	}, [toast]);

	useEffect(() => {
		loadCourses();
	}, [loadCourses]);

	useEffect(() => {
		if (selectedCourseId) {
			loadCourseStats(selectedCourseId);
		}
	}, [loadCourseStats, selectedCourseId]);

	if (loading) return <LoadingSpinner text="Loading analytics..." />;

	return (
		<div className="space-y-6 animate-fade-in">
			<PageHeader title="Teaching Analytics" description="Track progress, submissions, score spread, and attendance for your courses." />

			<CourseStatsPanel
				title="Teaching analytics"
				subtitle="Inspect completion, submission, score, and attendance patterns for one of your courses."
				courses={courses}
				selectedCourseId={selectedCourseId}
				onSelectCourse={setSelectedCourseId}
				loading={courseLoading}
				overview={courseStats?.overview}
				completion={courseStats?.completion || []}
				submissionRate={courseStats?.submissionRate || []}
				scoreDistribution={courseStats?.scoreDistribution || []}
				attendance={courseStats?.attendance || []}
				onRefresh={() => selectedCourseId && loadCourseStats(selectedCourseId)}
				emptyMessage={courses.length ? 'Select one of your courses to view analytics.' : 'No courses yet'}
			/>
		</div>
	);
}
