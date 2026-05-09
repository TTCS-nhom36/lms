import { useEffect, useState } from 'react';
import { courseApi } from '../../api/courseApi';
import { statsApi } from '../../api/statsApi';
import CourseStatsPanel from '../../components/stats/CourseStatsPanel';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';

export default function AdminCourseAnalytics() {
	const toast = useToast();
	const [courses, setCourses] = useState([]);
	const [selectedCourseId, setSelectedCourseId] = useState('');
	const [courseStats, setCourseStats] = useState(null);
	const [loading, setLoading] = useState(true);
	const [courseLoading, setCourseLoading] = useState(false);

	useEffect(() => {
		loadCourses();
	}, []);

	useEffect(() => {
		if (selectedCourseId) {
			loadCourseStats(selectedCourseId);
		}
	}, [selectedCourseId]);

	const loadCourses = async () => {
		setLoading(true);
		try {
			const coursesRes = await courseApi.getAll({ size: 1000 });
			const loadedCourses = coursesRes.data.items || [];
			setCourses(loadedCourses);
			if (loadedCourses.length > 0) {
				setSelectedCourseId(String(loadedCourses[0].id));
			} else {
				setSelectedCourseId('');
				setCourseStats(null);
			}
		} catch (error) {
			toast.error(error.response?.data?.message || 'Failed to load courses');
		} finally {
			setLoading(false);
		}
	};

	const loadCourseStats = async (courseId) => {
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
			toast.error(error.response?.data?.message || 'Failed to load course analytics');
		} finally {
			setCourseLoading(false);
		}
	};

	if (loading) return <LoadingSpinner text="Loading analytics..." />;

	return (
		<div className="space-y-6 animate-fade-in">
			

			<CourseStatsPanel
				
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
				emptyMessage={courses.length ? 'Select a course to view its analytics.' : 'No courses available yet.'}
			/>
		</div>
	);
}