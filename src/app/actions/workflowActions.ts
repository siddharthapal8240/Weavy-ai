"use server";

import { query } from "@/lib/db";
import type { SaveWorkflowParams } from "@/lib/types";
import { auth } from "@clerk/nextjs/server";

export async function saveWorkflowAction({ id, name, nodes, edges }: SaveWorkflowParams) {
    const { userId } = await auth();
    if (!userId) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const workflowJson = JSON.stringify({ nodes, edges });

        if (id) {
            console.log(`🔒 Updating Workflow ID: ${id}`);
            const sql = `
                UPDATE workflows 
                SET data = $1, name = $2, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $3 AND user_id = $4
                RETURNING id;
            `;
            const result = await query(sql, [workflowJson, name, id, userId]);
            
            if (result.rowCount === 0) {
                return { success: false, error: "Workflow not found or unauthorized" };
            }
            
            return { success: true, id };

        } else {
            console.log("🔒 Creating New Workflow");
            const sql = `
                INSERT INTO workflows (name, data, created_at, updated_at, user_id) 
                VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $3)
                RETURNING id;
            `;
            const result = await query(sql, [name, workflowJson, userId]);
            return { success: true, id: result.rows[0].id };
        }

    } catch (error) {
        console.error("❌ Database Error:", error);
        return { success: false, error: "Failed to save workflow." };
    }
}

export async function loadWorkflowAction(id: string) {
    const { userId } = await auth();
    if (!userId) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const sql = `SELECT name, data FROM workflows WHERE id = $1 AND user_id = $2`;
        const result = await query(sql, [id, userId]);

        if (result.rows.length === 0) {
            return { success: false, error: "Workflow not found" };
        }

        return {
            success: true,
            data: result.rows[0].data,
            name: result.rows[0].name
        };
    } catch (error) {
        console.error("❌ Load Error:", error);
        return { success: false, error: "Failed to load workflow." };
    }
}

export async function getUserWorkflowsAction() {
    const { userId } = await auth();
    if (!userId) {
        return { success: false, error: "Unauthorized", workflows: [] };
    }

    try {
        const sql = `
            SELECT id, name, created_at, updated_at 
            FROM workflows 
            WHERE user_id = $1
            ORDER BY updated_at DESC
        `;
        const result = await query(sql, [userId]);

        return {
            success: true,
            workflows: result.rows
        };
    } catch (error) {
        console.error("❌ Fetch Workflows Error:", error);
        return { success: false, error: "Failed to fetch workflows.", workflows: [] };
    }
}

export async function deleteWorkflowAction(id: string) {
    const { userId } = await auth();
    if (!userId) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const sql = `DELETE FROM workflows WHERE id = $1 AND user_id = $2 RETURNING id`;
        const result = await query(sql, [id, userId]);

        if (result.rows.length === 0) {
            return { success: false, error: "Workflow not found or unauthorized" };
        }

        return { success: true };
    } catch (error) {
        console.error("❌ Delete Error:", error);
        return { success: false, error: "Failed to delete workflow." };
    }
}