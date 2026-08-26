using FluentValidation;
using Restaurante.Application.DTOs;

namespace Restaurante.Application.Validators;

public class CreateTableDtoValidator : AbstractValidator<CreateTableDto>
{
    public CreateTableDtoValidator()
    {
        RuleFor(x => x.Number)
            .GreaterThan(0).WithMessage("Table number must be greater than 0");

        RuleFor(x => x.Capacity)
            .GreaterThan(0).WithMessage("Capacity must be greater than 0")
            .LessThanOrEqualTo(20).WithMessage("Capacity cannot exceed 20");
    }
}

public class UpdateTableDtoValidator : AbstractValidator<UpdateTableDto>
{
    public UpdateTableDtoValidator()
    {
        RuleFor(x => x.Capacity)
            .GreaterThan(0).WithMessage("Capacity must be greater than 0")
            .LessThanOrEqualTo(20).WithMessage("Capacity cannot exceed 20");

        RuleFor(x => x.Location)
            .MaximumLength(50).WithMessage("Location cannot exceed 50 characters")
            .When(x => !string.IsNullOrEmpty(x.Location));
    }
}

public class OpenTableDtoValidator : AbstractValidator<OpenTableDto>
{
    public OpenTableDtoValidator()
    {
        RuleFor(x => x.CustomerName)
            .MaximumLength(100).WithMessage("Customer name cannot exceed 100 characters")
            .When(x => !string.IsNullOrEmpty(x.CustomerName));

        RuleFor(x => x.Observations)
            .MaximumLength(500).WithMessage("Observations cannot exceed 500 characters")
            .When(x => !string.IsNullOrEmpty(x.Observations));
    }
}
