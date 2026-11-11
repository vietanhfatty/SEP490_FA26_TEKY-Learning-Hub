using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Enums;

namespace TekyLearningHub.Infrastructure.Services;

public class ExcelExportService : IExcelExportService
{
    private readonly IApplicationDbContext _context;

    public ExcelExportService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<byte[]> ExportClassGradebookAsync(Guid classId, CancellationToken cancellationToken = default)
    {
        var classroom = await _context.Classrooms
            .AsNoTracking()
            .Include(c => c.Teacher)
            .Include(c => c.Students)
                .ThenInclude(cs => cs.Student)
            .Include(c => c.Assignments)
                .ThenInclude(a => a.Submissions)
                    .ThenInclude(s => s.RubricDetail)
            .FirstOrDefaultAsync(c => c.Id == classId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy thông tin lớp học.");

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Bảng Điểm Thực Hành STEM");

        // Brand Title Header
        worksheet.Cell(1, 1).Value = "HỌC VIỆN SÁNG TẠO CÔNG NGHỆ TEKY - BẢNG ĐIỂM THỰC HÀNH STEM & AST";
        worksheet.Range(1, 1, 1, 8).Merge().Style
            .Font.SetBold(true)
            .Font.SetFontSize(14)
            .Font.SetFontColor(XLColor.White)
            .Fill.SetBackgroundColor(XLColor.FromHtml("#2563EB"))
            .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);

        worksheet.Cell(2, 1).Value = $"Lớp: {classroom.Name} ({classroom.ClassCode}) | Giáo viên: {classroom.Teacher.FullName} | Xuất ngày: {DateTime.Now:dd/MM/yyyy HH:mm}";
        worksheet.Range(2, 1, 2, 8).Merge().Style
            .Font.SetItalic(true)
            .Font.SetFontSize(10)
            .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);

        // Column Headers
        var headers = new[]
        {
            "STT", "Mã Học Sinh", "Họ và Tên", "Điểm AST (60%)", "Lắp ráp", "Giải thích", "Teamwork", "Tổng kết (60/40)"
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

        var activeStudents = classroom.Students.Where(cs => cs.IsActive).OrderBy(cs => cs.Student.FullName).ToList();
        foreach (var item in activeStudents)
        {
            var student = item.Student;
            // Get latest graded submission
            var submission = classroom.Assignments
                .SelectMany(a => a.Submissions)
                .Where(s => s.StudentId == student.Id && s.Status == SubmissionStatus.Graded)
                .OrderByDescending(s => s.SubmittedAt)
                .FirstOrDefault();

            worksheet.Cell(row, 1).Value = stt++;
            worksheet.Cell(row, 2).Value = student.StudentCode;
            worksheet.Cell(row, 3).Value = student.FullName;

            if (submission != null)
            {
                worksheet.Cell(row, 4).Value = submission.AstAutoScore;
                worksheet.Cell(row, 5).Value = submission.RubricDetail?.AssemblyScore ?? 0;
                worksheet.Cell(row, 6).Value = submission.RubricDetail?.AlgorithmExplainScore ?? 0;
                worksheet.Cell(row, 7).Value = submission.RubricDetail?.TeamworkScore ?? 0;
                worksheet.Cell(row, 8).Value = submission.TotalScore;

                // Highlight high achievers
                if (submission.TotalScore >= 8.5)
                {
                    worksheet.Cell(row, 8).Style.Font.SetBold(true).Font.SetFontColor(XLColor.FromHtml("#16A34A"));
                }
            }
            else
            {
                worksheet.Cell(row, 4).Value = "-";
                worksheet.Cell(row, 5).Value = "-";
                worksheet.Cell(row, 6).Value = "-";
                worksheet.Cell(row, 7).Value = "-";
                worksheet.Cell(row, 8).Value = "Chưa nộp";
            }

            for (int col = 1; col <= 8; col++)
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
