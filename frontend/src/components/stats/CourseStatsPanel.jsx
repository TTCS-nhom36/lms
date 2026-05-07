import { useEffect, useState } from 'react';
import { BarChart3, Users, ClipboardCheck, Star, Video, RefreshCw, TrendingUp } from 'lucide-react';

function MetricCard({ icon: Icon, label, value, description, accent = 'bg-slate-50 text-slate-700' }) {
	return (
		<div className="card p-4 border border-gray-200 bg-white">
			<div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${accent}`}>
				<Icon size={18} />
			</div>
			<div className="text-2xl font-bold text-gray-900">{value}</div>
			<div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
			{description ? <div className="text-[11px] text-gray-400 mt-1">{description}</div> : null}
		</div>
	);
}

function ProgressBarRow({ label, value, total, percent, tone = 'bg-blue-500' }) {
	const safePercent = Math.max(0, Math.min(100, Number(percent || 0)));
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between gap-4 text-xs">
				<div className="text-gray-700 font-medium truncate">{label}</div>
				<div className="text-gray-500 shrink-0">{value}/{total} • {safePercent.toFixed(1)}%</div>
			</div>
			<div className="h-2 rounded-full bg-gray-100 overflow-hidden">
				<div className={`h-full rounded-full ${tone}`} style={{ width: `${safePercent}%` }} />
			</div>
		</div>
	);
}

function DistributionBar({ label, count, percentage }) {
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between text-xs">
				<span className="text-gray-700 font-medium">{label}</span>
				<span className="text-gray-500">{count} • {Number(percentage || 0).toFixed(1)}%</span>
			</div>
			<div className="h-2 rounded-full bg-gray-100 overflow-hidden">
				<div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, Number(percentage || 0)))}%` }} />
			</div>
		</div>
	);
}

function AttendanceRow({ item }) {
	return (
		<tr className="border-t border-gray-100">
			<td className="py-3 pr-3">
				<div className="font-medium text-gray-900 text-sm">{item.fullName}</div>
				<div className="text-xs text-gray-500">{item.email}</div>
			</td>
			<td className="py-3 pr-3 text-sm text-gray-700">{Math.round((item.watchDurationSecs || 0) / 60)} min</td>
			<td className="py-3 pr-3 text-sm text-gray-700">{item.completedLessons}/{item.totalLessons}</td>
			<td className="py-3 text-sm text-gray-700">{Number(item.lessonCompletionRate || 0).toFixed(1)}%</td>
		</tr>
	);
}

export default function CourseStatsPanel({
	title,
	subtitle,
	courses = [],
	selectedCourseId,
	onSelectCourse,
	loading,
	overview,
	completion = [],
	submissionRate = [],
	scoreDistribution = [],
	attendance = [],
	onRefresh,
	emptyMessage = 'Select a course to view statistics.',
}) {
	const [activeTab, setActiveTab] = useState('overview');
	const selectedCourse = courses.find((course) => String(course.id) === String(selectedCourseId));

	useEffect(() => {
		setActiveTab('overview');
	}, [selectedCourseId]);

	const tabs = [
		{ key: 'overview', label: 'Overview' },
		{ key: 'completion', label: 'Lesson Completion' },
		{ key: 'submission', label: 'Submission Rate' },
		{ key: 'score', label: 'Score Distribution' },
		{ key: 'attendance', label: 'Attendance' },
	];

	return (
		<div className="card p-6 space-y-6">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<h3 className="text-lg font-bold text-gray-900">{title}</h3>
					<p className="text-sm text-gray-500 mt-1">{subtitle}</p>
				</div>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
					<div className="min-w-[240px]">
						<label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Course</label>
						<select
							value={selectedCourseId || ''}
							onChange={(event) => onSelectCourse(event.target.value)}
							className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="" disabled>{courses.length ? 'Select a course' : 'No courses available'}</option>
							{courses.map((course) => (
								<option key={course.id} value={course.id}>{course.title}</option>
							))}
						</select>
					</div>
					{onRefresh ? (
						<button onClick={onRefresh} className="btn-secondary !py-2 !px-3 inline-flex items-center gap-2 self-start sm:self-auto">
							<RefreshCw size={14} /> Refresh
						</button>
					) : null}
				</div>
			</div>

			{loading ? (
				<div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-sm text-gray-500">
					Loading analytics...
				</div>
			) : !selectedCourse ? (
				<div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-sm text-gray-500">
					{emptyMessage}
				</div>
			) : (
				<>
					<div className="overflow-x-auto">
						<div className="inline-flex gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1 min-w-max">
							{tabs.map((tab) => (
								<button
									key={tab.key}
									type="button"
									onClick={() => setActiveTab(tab.key)}
									className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
										activeTab === tab.key
											? 'bg-white text-gray-900 shadow-sm'
											: 'text-gray-500 hover:text-gray-800'
									}`}
								>
									{tab.label}
								</button>
							))}
						</div>
					</div>

					{activeTab === 'overview' ? (
						overview ? (
							<div>
								<div className="flex items-center justify-between mb-4">
									<div>
										<h4 className="text-sm font-semibold text-gray-800">{selectedCourse?.title || overview.courseTitle}</h4>
										<p className="text-xs text-gray-500">Course-wide performance snapshot</p>
									</div>
									<div className="text-xs text-gray-500">{overview.activeStudents} active students</div>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
									<MetricCard icon={Users} label="Active Students" value={overview.activeStudents} description="currently enrolled" accent="bg-blue-50 text-blue-600" />
									<MetricCard icon={BarChart3} label="Lesson Completion" value={`${Number(overview.lessonCompletionRate || 0).toFixed(1)}%`} description={`${overview.completedLessons}/${overview.totalLessons} lessons completed`} accent="bg-emerald-50 text-emerald-600" />
									<MetricCard icon={ClipboardCheck} label="Submission Rate" value={`${Number(overview.submissionRate || 0).toFixed(1)}%`} description={`${overview.submittedAssignments}/${overview.activeStudents * overview.totalAssignments || 0} submissions`} accent="bg-amber-50 text-amber-600" />
									<MetricCard icon={Star} label="Average Score" value={Number(overview.averageScore || 0).toFixed(1)} description="raw score average" accent="bg-purple-50 text-purple-600" />
									<MetricCard icon={Video} label="Video Activity" value={`${Number(overview.activeViewerRate || 0).toFixed(1)}%`} description={`${Math.round((overview.averageWatchDurationSecs || 0) / 60)} min average watch time`} accent="bg-sky-50 text-sky-600" />
								</div>
							</div>
						) : <div className="text-sm text-gray-500">No overview data available.</div>
					) : null}

					{activeTab === 'completion' ? (
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<TrendingUp size={16} className="text-gray-500" />
								<h4 className="text-sm font-semibold text-gray-800">Lesson completion</h4>
							</div>
							<div className="space-y-4">
								{completion.length ? completion.map((item) => (
									<ProgressBarRow key={item.lessonId} label={item.lessonTitle} value={item.completedCount} total={item.activeStudents} percent={item.completionRate} tone="bg-emerald-500" />
								)) : <div className="text-sm text-gray-500">No lesson statistics available.</div>}
							</div>
						</div>
					) : null}

					{activeTab === 'submission' ? (
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<ClipboardCheck size={16} className="text-gray-500" />
								<h4 className="text-sm font-semibold text-gray-800">Assignment submissions</h4>
							</div>
							<div className="space-y-4">
								{submissionRate.length ? submissionRate.map((item) => (
									<ProgressBarRow key={item.assignmentId} label={item.assignmentTitle} value={item.submittedCount} total={item.activeStudents} percent={item.submissionRate} tone="bg-blue-500" />
								)) : <div className="text-sm text-gray-500">No submission statistics available.</div>}
							</div>
						</div>
					) : null}

					{activeTab === 'score' ? (
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<BarChart3 size={16} className="text-gray-500" />
								<h4 className="text-sm font-semibold text-gray-800">Score distribution</h4>
							</div>
							<div className="space-y-4">
								{scoreDistribution.length ? scoreDistribution.map((item) => (
									<DistributionBar key={item.label} label={item.label} count={item.count} percentage={item.percentage} />
								)) : <div className="text-sm text-gray-500">No score data available.</div>}
							</div>
						</div>
					) : null}

					{activeTab === 'attendance' ? (
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<Video size={16} className="text-gray-500" />
								<h4 className="text-sm font-semibold text-gray-800">Attendance by video watch time</h4>
							</div>
							<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
								<table className="w-full text-left">
									<thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
										<tr>
											<th className="px-4 py-3 font-semibold">Student</th>
											<th className="px-4 py-3 font-semibold">Watch</th>
											<th className="px-4 py-3 font-semibold">Lessons</th>
											<th className="px-4 py-3 font-semibold">Rate</th>
										</tr>
									</thead>
									<tbody>
										{attendance.length ? attendance.slice(0, 8).map((item) => <AttendanceRow key={item.userId} item={item} />) : (
											<tr>
												<td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>No attendance data available.</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
					) : null}
				</>
			)}
		</div>
	);
}