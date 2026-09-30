import { NextRequest, NextResponse } from 'next/server';
import {
  executeMoveStage,
  executeCreateTask,
  executeCreateNote,
  executeBookAppointment,
  executeRecordSale,
  executeAddTags,
} from '@/lib/pipeline-agent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountId, action, payload } = body;

    if (!accountId || !action || !payload) {
      return NextResponse.json(
        { error: 'Missing required parameters: accountId, action, payload' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'stage.move': {
        const { opportunityId, targetStage, reason, triggeredBy } = payload;
        if (!opportunityId || !targetStage) {
          return NextResponse.json(
            { error: 'Missing opportunityId or targetStage' },
            { status: 400 }
          );
        }
        const result = await executeMoveStage({
          accountId,
          opportunityId,
          targetStageNameOrId: targetStage,
          reason,
          triggeredBy,
        });
        return NextResponse.json(result);
      }

      case 'task.create': {
        const { contactId, opportunityId, title, body: taskBody, dueAt, assignedToUserId, triggeredBy } = payload;
        if (!contactId || !title || !dueAt) {
          return NextResponse.json(
            { error: 'Missing required task fields: contactId, title, dueAt' },
            { status: 400 }
          );
        }
        const result = await executeCreateTask({
          accountId,
          contactId,
          opportunityId,
          title,
          body: taskBody,
          dueAt,
          assignedToUserId,
          triggeredBy,
        });
        return NextResponse.json(result);
      }

      case 'note.create': {
        const { contactId, opportunityId, content, noteType, userId, triggeredBy } = payload;
        if (!contactId || !content) {
          return NextResponse.json(
            { error: 'Missing required note fields: contactId, content' },
            { status: 400 }
          );
        }
        const result = await executeCreateNote({
          accountId,
          contactId,
          opportunityId,
          content,
          noteType,
          userId,
          triggeredBy,
        });
        return NextResponse.json(result);
      }

      case 'appointment.create': {
        const { contactId, opportunityId, calendarId, startsAt, durationMin, title, notes, agentId, triggeredBy } = payload;
        if (!contactId || !startsAt) {
          return NextResponse.json(
            { error: 'Missing required appointment fields: contactId, startsAt' },
            { status: 400 }
          );
        }
        const result = await executeBookAppointment({
          accountId,
          contactId,
          opportunityId,
          calendarId,
          startsAt,
          durationMin,
          title,
          notes,
          agentId,
          triggeredBy,
        });
        return NextResponse.json(result);
      }

      case 'sale.record': {
        const { opportunityId, amount, notes, triggeredBy } = payload;
        if (!opportunityId || typeof amount !== 'number') {
          return NextResponse.json(
            { error: 'Missing required sale fields: opportunityId, amount (number)' },
            { status: 400 }
          );
        }
        const result = await executeRecordSale({
          accountId,
          opportunityId,
          amount,
          notes,
          triggeredBy,
        });
        return NextResponse.json(result);
      }

      case 'tags.add': {
        const { contactId, tags, triggeredBy } = payload;
        if (!contactId || !Array.isArray(tags) || tags.length === 0) {
          return NextResponse.json(
            { error: 'Missing required tags fields: contactId, tags (array)' },
            { status: 400 }
          );
        }
        const result = await executeAddTags({
          accountId,
          contactId,
          tags,
          triggeredBy,
        });
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: `Acción no soportada: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[API /api/agent/pipeline-actions] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
