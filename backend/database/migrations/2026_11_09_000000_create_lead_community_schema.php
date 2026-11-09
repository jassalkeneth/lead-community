<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('communities', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->string('name');
            $t->string('code')->unique();
            $t->string('region');
            $t->string('communityHeadId');
            $t->string('headName');
            $t->unsignedInteger('memberCount')->default(0);
            $t->unsignedInteger('teamsCount')->default(0);
            $t->text('description');
            $t->enum('activeStatus', ['ACTIVE', 'INACTIVE'])->default('ACTIVE');
            $t->integer('sortOrder')->default(0);
            $t->timestamps();
        });

        Schema::create('teams', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->string('communityId');
            $t->string('name');
            $t->string('teamLeadId');
            $t->string('leadName');
            $t->string('department');
            $t->unsignedInteger('membersCount')->default(0);
            $t->integer('sortOrder')->default(0);
            $t->timestamps();
            $t->foreign('communityId')->references('id')->on('communities');
        });

        Schema::create('app_users', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->string('name');
            $t->string('email')->unique();
            $t->enum('role', ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'COMMUNITY_HEAD', 'TEAM_LEAD']);
            $t->string('avatarUrl')->nullable();
            $t->string('title');
            $t->string('assignedCommunityId')->nullable();
            $t->string('assignedTeamId')->nullable();
            $t->integer('sortOrder')->default(0);
            $t->timestamps();
            $t->foreign('assignedCommunityId')->references('id')->on('communities');
            $t->foreign('assignedTeamId')->references('id')->on('teams');
        });

        Schema::create('periods', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->string('name');
            $t->string('periodCode')->unique();
            $t->date('startDate');
            $t->date('endDate');
            $t->dateTime('submissionDeadline');
            $t->enum('status', ['OPEN', 'REVIEWING', 'FINAL_APPROVAL', 'LOCKED', 'ARCHIVED'])->default('OPEN');
            $t->boolean('isCurrent')->default(false);
            $t->integer('sortOrder')->default(0);
            $t->timestamps();
        });

        Schema::create('kpi_definitions', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->string('key')->unique();
            $t->string('name');
            $t->string('category');
            $t->float('weight');
            $t->float('target');
            $t->enum('type', ['ratio', 'count', 'binary']);
            $t->string('unit');
            $t->text('description');
            $t->string('numeratorLabel')->nullable();
            $t->string('denominatorLabel')->nullable();
            $t->string('countLabel')->nullable();
            $t->boolean('isSystem')->default(false);
            $t->integer('sortOrder')->default(0);
            $t->timestamps();
        });

        Schema::create('submissions', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->string('periodId');
            $t->string('communityId');
            $t->string('teamId');
            $t->string('submittedById');
            $t->string('submittedByName');
            $t->string('submittedByRole');
            $t->enum('status', [
                'DRAFT', 'SUBMITTED', 'COMMUNITY_HEAD_REVIEW',
                'CHANGES_REQUESTED', 'OPERATIONS_MANAGER_REVIEW',
                'APPROVED', 'LOCKED',
            ])->default('DRAFT');
            $t->json('rawInputs');
            $t->json('results');
            $t->float('overallWeightedScore')->default(0);
            $t->float('provisionalScore')->default(0);
            $t->boolean('isProvisional')->default(true);
            $t->float('validWeightsTotal')->default(0);
            $t->unsignedInteger('onTrackCount')->default(0);
            $t->unsignedInteger('needsAttentionCount')->default(0);
            $t->unsignedInteger('pendingCount')->default(0);
            $t->dateTime('submittedAt')->nullable();
            $t->dateTime('reviewedAt')->nullable();
            $t->dateTime('approvedAt')->nullable();
            $t->dateTime('lockedAt')->nullable();
            $t->text('communityHeadNotes')->nullable();
            $t->text('operationsNotes')->nullable();
            $t->integer('sortOrder')->default(0);
            $t->timestamps();
            $t->unique(['periodId', 'teamId']);
            $t->index(['communityId', 'status']);
            $t->foreign('periodId')->references('id')->on('periods');
            $t->foreign('communityId')->references('id')->on('communities');
            $t->foreign('teamId')->references('id')->on('teams');
        });

        Schema::create('action_plans', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->string('submissionId')->nullable();
            $t->string('periodId')->nullable();
            $t->string('communityId')->nullable();
            $t->string('teamId')->nullable();
            $t->string('kpiKey');
            $t->string('kpiName');
            $t->string('title');
            $t->text('identifiedRootCause');
            $t->text('verifiedFactVsHypothesis');
            $t->text('recommendedIntervention');
            $t->string('actionOwner');
            $t->string('ownerUserId')->nullable();
            $t->date('proposedDeadline');
            $t->text('measurableRecoveryTarget');
            $t->text('currentScoreSummary');
            $t->enum('status', ['DRAFT_AI', 'PENDING_APPROVAL', 'ACTIVE', 'RESOLVED', 'BLOCKED'])->default('PENDING_APPROVAL');
            $t->float('progressPercentage')->default(0);
            $t->boolean('aiGenerated')->default(false);
            $t->string('approvedById')->nullable();
            $t->string('approvedByName')->nullable();
            $t->json('updates');
            $t->integer('sortOrder')->default(0);
            $t->timestamps();
            $t->index(['submissionId', 'status']);
        });

        Schema::create('audit_logs', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->enum('entityType', ['SCORECARD', 'ACTION_PLAN', 'PERIOD', 'KPI_DEFINITION', 'USER']);
            $t->string('entityId');
            $t->string('action');
            $t->string('actorId');
            $t->string('actorName');
            $t->string('actorRole');
            $t->json('previousState')->nullable();
            $t->json('newState')->nullable();
            $t->text('details');
            $t->dateTime('timestamp');
            $t->integer('sortOrder')->default(0);
            $t->index(['entityType', 'entityId']);
        });

        Schema::create('notifications_app', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->string('recipientRole')->nullable();
            $t->string('recipientUserId')->nullable();
            $t->string('title');
            $t->text('message');
            $t->enum('type', ['DEADLINE', 'SUBMISSION', 'APPROVAL', 'ACTION_REQUIRED', 'AI_INSIGHT', 'REVIEW_REQUIRED']);
            $t->boolean('read')->default(false);
            $t->string('linkTab')->nullable();
            $t->dateTime('timestamp');
            $t->integer('sortOrder')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications_app');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('action_plans');
        Schema::dropIfExists('submissions');
        Schema::dropIfExists('kpi_definitions');
        Schema::dropIfExists('periods');
        Schema::dropIfExists('app_users');
        Schema::dropIfExists('teams');
        Schema::dropIfExists('communities');
    }
};
