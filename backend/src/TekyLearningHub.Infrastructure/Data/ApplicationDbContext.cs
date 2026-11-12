using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Infrastructure.Data;

public class ApplicationDbContext : TekyLearningHubContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }
}
