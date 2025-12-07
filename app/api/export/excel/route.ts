import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { data, filename, type } = await req.json()

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Aucune donnée" }, { status: 400 })
    }

    // Simulation export Excel - dans un vrai projet, utilisez exceljs ou sheetjs
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join("\t"),
      ...data.map((row: any) =>
        headers.map(header => row[header] ?? "").join("\t")
      )
    ].join("\n")

    const blob = new Blob([csvContent], { 
      type: "application/vnd.ms-excel" 
    })

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/vnd.ms-excel",
        "Content-Disposition": `attachment; filename="${filename}.xls"`
      }
    })
  } catch (error) {
    console.error("Erreur export Excel:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
