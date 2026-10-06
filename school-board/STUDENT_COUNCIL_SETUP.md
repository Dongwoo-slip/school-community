# 학생회 소통 기능 설정

## 1. Supabase 적용

Supabase SQL Editor에서 아래 파일을 순서대로 실행합니다.

1. `supabase/20260724_student_council.sql`
2. 선택 사항: `supabase/20260724_student_council_seed.sql`

첫 번째 SQL은 기능 공개 상태를 `ON`으로 생성하거나 기존 설정을 `ON`으로 갱신합니다. 두 번째 SQL은 게시물이 하나도 없고 `profiles.role = 'admin'` 계정이 있을 때만 미리보기용 게시물 3개를 추가합니다. 운영 데이터에 자동으로 실행되지 않습니다.

## 2. 관리자 사용

- 관리 화면: `/community/free/admin/student-council`
- 일반 화면 미리보기: `/community/free/student-council`
- 기존 `profiles.role = 'admin'` 권한을 그대로 사용합니다.
- 관리 화면 상단의 `학생회 소통 기능 공개` 버튼으로 전체 공개 상태를 전환합니다.
- 게시물의 `게시 상태`를 체크하지 않으면 임시 저장/비게시 상태입니다.
- 게시물 목록의 `확인자` 버튼에서 조회 수, 확인 수, 확인율 기본 데이터, 확인 사용자와 최근 확인 시각을 볼 수 있습니다.

## 3. 공개 상태

- `OFF`: 관리자만 목록, 상세, 관리 화면에 접근할 수 있습니다.
- `ON`: 로그인한 일반 사용자도 게시된 게시물을 조회하고 게시물별로 한 번만 확인 응답을 남길 수 있습니다.
- 일반 사용자는 확인 수, 확인 사용자, 조회 통계를 조회할 수 없습니다.

## 4. 데이터 구조

- `student_council_settings`: 전체 기능 공개 여부
- `student_council_posts`: `notice`, `council`, `activity` 카테고리를 공유하는 통합 게시물
- `student_council_acknowledgements`: 사용자별 게시물 확인 기록, `(post_id, user_id)` 유일
- `student_council_post_views`: 상세 화면 조회 기록

모든 테이블은 RLS가 활성화됩니다. 일반 사용자는 기능이 공개된 상태의 게시 게시물과 본인 확인 기록만 다룰 수 있고, 관리자는 기존 관리자 역할을 통해 관리 권한을 얻습니다.

## 5. 환경 변수

새 환경 변수는 없습니다. 기존 값이 필요합니다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 또는 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 6. 확인 체크리스트

1. 기능 `OFF`에서 일반 사용자 상단 메뉴 미노출
2. 기능 `OFF`에서 일반 사용자 직접 URL 접근 시 404
3. 기능 `OFF`에서 관리자 목록/상세 미리보기 가능
4. 기능 `ON`에서 로그인 사용자 게시글 조회 가능
5. 일반 사용자의 관리자 URL 접근 시 404
6. 관리자 게시물 작성, 수정, 임시 저장, 게시 전환, 삭제
7. 동일 사용자의 동일 게시물 확인 응답 중복 방지
8. 일반 API에서 확인 결과와 통계 미노출
9. 관리자 화면에서만 조회 수와 확인 사용자 표시
10. 모바일/데스크톱 카드와 입력 폼 레이아웃 확인
