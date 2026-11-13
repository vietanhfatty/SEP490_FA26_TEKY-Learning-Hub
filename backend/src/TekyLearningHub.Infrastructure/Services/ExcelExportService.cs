using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces;

namespace TekyLearningHub.Infrastructure.Services;

public class ExcelExportService : IExcelExportService
{
    private readonly IApplicationDbContext _context;

    public ExcelExportService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<byte[]> ExportClassGradebookAsync(int classId, CancellationToken cancellationToken = default)
    {
        var classroom = await _context.Classes
            .AsNoTracking()
            .Include(c => c.Teacher)
                .ThenInclude(t => t!.User)
            .Include(c => c.Enrollments)
                .ThenInclude(e => e.Student)
                    .ThenInclude(s => s.User)
            .Include(c => c.Assignments)
                .ThenInclude(a => a.Submissions)
                    .ThenInclude(s => s.Grade)
            .FirstOrDefaultAsync(c => c.ClassId == classId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy thông tin lớp học.");

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Bảng Điểm Thực Hành STEM");

        // Brand Title Header
        worksheet.Cell(1, 1).Value = "HỌC VIỆN SÁNG TẠO CÔNG NGHỆ TEKY - BẢNG ĐIỂM THỰC HÀNH STEM & AST";
        worksheet.Range(1, 1, 1, 7).Merge().Style
            .Font.SetBold(true)
            .Font.SetFontSize(14)
            .Font.SetFontColor(XLColor.White)
            .Fill.SetBackgroundColor(XLColor.FromHtml("#2563EB"))
            .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);

        worksheet.Cell(2, 1).Value = $"Lớp: {classroom.Name} ({classroom.ClassCode}) | Giáo viên: {classroom.Teacher?.User.FullName ?? "Chưa phân công"} | Xuất ngày: {DateTime.Now:dd/MM/yyyy HH:mm}";
        worksheet.Range(2, 1, 2, 7).Merge().Style
            .Font.SetItalic(true)
            .Font.SetFontSize(10)
            .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);

        // Column Headers
        var headers = new[]
        {
            "STT", "Mã Học Sinh", "Họ và Tên", "Điểm AST (60%)", "Điểm Phần Cứng (40%)", "Tổng Kết (60/40)", "Trạng Thái"
        };

        for (int i = 0; i < headers.Length; i++)
        {
            var cell = worksheet.Cell(4, i + 1);
            cell.Value = headers[i];
            cell.Style
                .Font.SetBold(true)
                .Fill.SetBackgroundColor(XLColor.FromHtml("#F1F5F9"))
                .Border.SetOutsideBorder(XLBorderStyleValues.Thin)
                .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        }

        int row = 5;
        int stt = 1;

        var activeStudents = classroom.Enrollments.Where(e => e.Status == "Active").OrderBy(e => e.Student.User.FullName).ToList();
        foreach (var item in activeStudents)
        {
            var student = item.Student;
            // Latest graded submission
            var submission = classroom.Assignments
                .SelectMany(a => a.Submissions)
                .Where(s => s.StudentId == student.UserId && s.Grade != null)
                .OrderByDescending(s => s.SubmittedAt)
                .FirstOrDefault();

            worksheet.Cell(row, 1).Value = stt++;
            worksheet.Cell(row, 2).Value = student.StudentCode;
            worksheet.Cell(row, 3).Value = student.User.FullName;

            if (submission?.Grade != null)
            {
                worksheet.Cell(row, 4).Value = submission.Grade.AutoAstScore ?? 0m;
                worksheet.Cell(row, 5).Value = submission.Grade.HardwareScore ?? 0m;
                worksheet.Cell(row, 6).Value = submission.Grade.FinalScore ?? 0m;
                worksheet.Cell(row, 7).Value = submission.Grade.FinalScore >= 8.5m ? "Xuất sắc" : submission.Grade.FinalScore >= 7.0m ? "Khá" : "Đạt";

                if (submission.Grade.FinalScore >= 8.5m)
                {
                    worksheet.Cell(row, 6).Style.Font.SetBold(true).Font.SetFontColor(XLColor.FromHtml("#16A34A"));
                }
            }
            else
            {
                worksheet.Cell(row, 4).Value = "-";
                worksheet.Cell(row, 5).Value = "-";
                worksheet.Cell(row, 6).Value = "-";
                worksheet.Cell(row, 7).Value = "Chưa hoàn thành";
            }

            for (int col = 1; col <= 7; col++)
            {
                worksheet.Cell(row, col).Style.Border.SetOutsideBorder(XLBorderStyleValues.Thin);
                if (col != 3)
                {
                    worksheet.Cell(row, col).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
                }
            }

            row++;
        }

        worksheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }
}
