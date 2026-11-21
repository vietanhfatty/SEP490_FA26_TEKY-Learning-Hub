using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using ClosedXML.Excel;
using TekyLearningHub.Application.Interfaces.Backoffice;

namespace TekyLearningHub.Infrastructure.Services;

/// <summary>
/// Xuất sổ điểm lớp ra Excel. Dữ liệu đã được repository vật chất hoá;
/// adapter chỉ dựng và định dạng file.
/// </summary>
public class ExcelExportService(ITeacherRepository repository) : IExcelExportService
{
    public async Task<byte[]> ExportClassGradebookAsync(int classId, CancellationToken cancellationToken = default)
    {
        var gradebook = await repository.GradebookRow(classId, cancellationToken)
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

        worksheet.Cell(2, 1).Value = $"Lớp: {gradebook.ClassName} ({gradebook.ClassCode}) | Giáo viên: {gradebook.TeacherName} | Xuất ngày: {DateTime.Now:dd/MM/yyyy HH:mm}";
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

        foreach (var item in gradebook.Students)
        {
            worksheet.Cell(row, 1).Value = stt++;
            worksheet.Cell(row, 2).Value = item.StudentCode;
            worksheet.Cell(row, 3).Value = item.FullName;

            if (item.FinalScore.HasValue)
            {
                worksheet.Cell(row, 4).Value = item.AutoAstScore ?? 0m;
                worksheet.Cell(row, 5).Value = item.HardwareScore ?? 0m;
                worksheet.Cell(row, 6).Value = item.FinalScore.Value;
                worksheet.Cell(row, 7).Value = item.FinalScore.Value >= 8.5m ? "Xuất sắc" : item.FinalScore.Value >= 7.0m ? "Khá" : "Đạt";

                if (item.FinalScore.Value >= 8.5m)
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

    /// <summary>Mẫu Excel cho quản trị viên điền danh sách nhân sự rồi nhập hàng loạt.</summary>
    public async Task<byte[]> BuildStaffImportTemplateAsync(CancellationToken cancellationToken = default)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Nhân sự");
        sheet.Cell(1, 1).Value = "Email";
        sheet.Cell(1, 2).Value = "Họ tên";
        sheet.Cell(2, 1).Value = "giao.vien@example.edu.vn";
        sheet.Cell(2, 2).Value = "Nguyễn Văn A";
        sheet.Column(1).Width = 36;
        sheet.Column(2).Width = 28;
        sheet.Row(1).Style.Font.SetBold(true);
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return await Task.FromResult(stream.ToArray());
    }

    /// <summary>Đọc cột Email và Họ tên từ sheet đầu tiên của file Excel.</summary>
    public async Task<(string Email, string? FullName)[]> ReadStaffImportAsync(Stream content, CancellationToken cancellationToken = default)
    {
        using var workbook = new XLWorkbook(content);
        var sheet = workbook.Worksheets.FirstOrDefault()
            ?? throw new InvalidOperationException("File Excel không có trang tính nào.");
        var rows = new List<(string, string?)>();
        foreach (var row in sheet.RowsUsed().Skip(1))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var email = row.Cell(1).GetString().Trim();
            if (email.Length == 0) continue;
            var name = row.Cell(2).GetString().Trim();
            rows.Add((email, name.Length == 0 ? null : name));
        }
        return await Task.FromResult(rows.ToArray());
    }
}
