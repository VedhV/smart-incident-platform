import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import pool from "@/lib/db";
import clientPromise from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const incidentId = Number(body.incident_id);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const evidenceType =
      typeof body.evidence_type === "string"
        ? body.evidence_type.trim()
        : "investigation_note";

    if (
      !Number.isInteger(incidentId) ||
      incidentId < 1 ||
      !title ||
      !content
    ) {
      return NextResponse.json(
        { success: false, message: "Valid incident ID, title and content are required." },
        { status: 400 }
      );
    }

    const incident = await pool.query(
      "SELECT incident_id FROM incidents WHERE incident_id = $1",
      [incidentId]
    );

    if (incident.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Incident not found in PostgreSQL." },
        { status: 404 }
      );
    }

    const client = await clientPromise;
    const database = client.db("smart_incident_nosql");

    const result = await database.collection("incident_evidence").insertOne({
      incident_id: incidentId,
      evidence_type: evidenceType,
      title,
      content,
      submitted_by:
        typeof body.submitted_by === "string" ? body.submitted_by : "Admin User",
      metadata:
        body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
          ? body.metadata
          : {},
      created_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Evidence stored successfully.",
      evidence_id: result.insertedId.toString(),
    }, { status: 201 });
  } catch (error) {
    console.error("Evidence creation failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to store evidence." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const incidentId = url.searchParams.get("incident_id");

    const filter: { incident_id?: number } = {};

    if (incidentId !== null) {
      const parsedId = Number(incidentId);

      if (!Number.isInteger(parsedId) || parsedId < 1) {
        return NextResponse.json(
          { success: false, message: "Invalid incident ID." },
          { status: 400 }
        );
      }

      filter.incident_id = parsedId;
    }

    const client = await clientPromise;
    const database = client.db("smart_incident_nosql");

    const evidence = await database
      .collection("incident_evidence")
      .find(filter)
      .sort({ created_at: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      count: evidence.length,
      evidence: evidence.map((item) => ({
        ...item,
        _id: (item._id as ObjectId).toString(),
      })),
    });
  } catch (error) {
    console.error("Evidence retrieval failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve evidence." },
      { status: 500 }
    );
  }
}
