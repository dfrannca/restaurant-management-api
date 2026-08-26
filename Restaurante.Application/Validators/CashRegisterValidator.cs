using FluentValidation;
using Restaurante.Application.DTOs;

namespace Restaurante.Application.Validators;

public class OpenCashRegisterDtoValidator : AbstractValidator<OpenCashRegisterDto>
{
    public OpenCashRegisterDtoValidator()
    {
        RuleFor(x => x.OpeningBalance)
            .GreaterThanOrEqualTo(0).WithMessage("Opening balance must be greater than or equal to 0");
    }
}

public class CloseCashRegisterDtoValidator : AbstractValidator<CloseCashRegisterDto>
{
    public CloseCashRegisterDtoValidator()
    {
        RuleFor(x => x.ClosingBalance)
            .GreaterThanOrEqualTo(0).WithMessage("Closing balance must be greater than or equal to 0");
    }
}
