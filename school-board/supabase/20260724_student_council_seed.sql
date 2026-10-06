-- Optional preview data. Run only after 20260724_student_council.sql.
-- This file inserts data only when the table is empty and an admin profile exists.

with first_admin as (
  select id
  from public.profiles
  where role = 'admin'
  order by id
  limit 1
),
seed_rows (
  category,
  title,
  summary,
  body,
  target_audience,
  action_required,
  decision_reason,
  department,
  event_date,
  deadline,
  meeting_date,
  discussion_topics,
  opinions,
  decision,
  next_schedule,
  progress_stage,
  status,
  is_pinned
) as (
  values
    (
      'notice',
      '체육대회 종목 및 준비 사항 안내',
      '체육대회 종목과 학급별 준비 사항을 안내합니다.',
      '참가 종목과 준비물을 확인하고, 학급별 담당 학생의 안내에 따라 준비해 주세요.',
      '전교생',
      '본인 참가 종목과 준비물을 확인해 주세요.',
      null,
      '체육문화부',
      now() + interval '14 days',
      now() + interval '7 days',
      null,
      null,
      null,
      null,
      null,
      null,
      'published',
      true
    ),
    (
      'council',
      '7월 대의원회 주요 논의 결과',
      '7월 대의원회에서 논의된 안건과 결정 사항을 공유합니다.',
      '학급별 건의 사항과 학교생활 개선 안건을 검토했습니다.',
      '전교생',
      null,
      '학생 의견과 운영 가능성을 함께 검토해 우선순위를 정했습니다.',
      '학생자치부',
      null,
      null,
      now() - interval '3 days',
      '학교생활 불편 사항, 행사 운영 방식, 건의함 개선',
      '학급별 전달 누락을 줄일 수 있는 상시 공지 공간이 필요하다는 의견이 제시되었습니다.',
      '학생회 소통 페이지를 시범 운영하기로 결정했습니다.',
      '시범 운영 결과를 다음 대의원회에서 검토합니다.',
      null,
      'published',
      false
    ),
    (
      'activity',
      '2학기 학생회 소통 체계 구축',
      '학생회 공지와 대의원회 결과를 한곳에서 확인할 수 있는 체계를 준비하고 있습니다.',
      '시범 운영 기간 동안 게시물 구성과 확인 기능을 점검합니다.',
      '전교생',
      null,
      '공지 전달 누락과 지난 공지 검색의 어려움을 줄이기 위한 사업입니다.',
      '홍보소통부',
      null,
      null,
      null,
      null,
      null,
      null,
      '시범 운영 후 개선 의견을 반영합니다.',
      '준비 중',
      'in_progress',
      false
    )
)
insert into public.student_council_posts (
  category,
  title,
  summary,
  body,
  target_audience,
  action_required,
  decision_reason,
  department,
  event_date,
  deadline,
  meeting_date,
  discussion_topics,
  opinions,
  decision,
  next_schedule,
  progress_stage,
  status,
  is_pinned,
  is_published,
  created_by,
  updated_by,
  published_at
)
select
  seed.category,
  seed.title,
  seed.summary,
  seed.body,
  seed.target_audience,
  seed.action_required,
  seed.decision_reason,
  seed.department,
  seed.event_date,
  seed.deadline,
  seed.meeting_date,
  seed.discussion_topics,
  seed.opinions,
  seed.decision,
  seed.next_schedule,
  seed.progress_stage,
  seed.status,
  seed.is_pinned,
  true,
  admin.id,
  admin.id,
  now()
from seed_rows seed
cross join first_admin admin
where not exists (select 1 from public.student_council_posts);
