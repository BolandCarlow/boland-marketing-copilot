import { NextResponse } from "next/server";

const template = "customer_name,phone,email,lead_source,brand,vehicle_model,registration_or_stock_number,county,assigned_salesperson,lead_status,date_time_received,notes\n";

export async function GET() {
  return new NextResponse(template, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=boland-lead-import-template.csv"
    }
  });
}
